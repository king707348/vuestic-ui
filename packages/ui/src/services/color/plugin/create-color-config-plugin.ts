import { PartialGlobalConfig } from './../../global-config/types'
import { ColorVariables } from './../types'
import { App, watch, computed } from 'vue'
import { isServer } from '../../../utils/ssr'
import { cssVariableName } from '../utils'
import { useColors } from '../../../composables'
import { generateUniqueId } from '../../../utils/uuid'
import { addOrUpdateStyleElement } from '../../../utils/dom'
import { useGlobalConfig } from '../../global-config/global-config'

export const setCSSVariable = (name: string, value: string, root: HTMLElement) => {
  root.style.setProperty(cssVariableName(name), value)
}

export const generateCSSVariable = (key: string, value: string) => {
  return `${cssVariableName(key)}: ${value};\n`
}

export const createColorConfigPlugin = (app: App, config?: PartialGlobalConfig) => {
  const { colors: configColors, getTextColor, getColor, currentPresetName, applyPreset } = useColors()
  const { globalConfig } = useGlobalConfig()

  const isStyleTag = computed(() => globalConfig.value.colors?.styleTag ?? false)

  /** Renders CSS variables string. Use this in SSR mode */
  const renderCSSVariables = (colors: ColorVariables | undefined = configColors) => {
    if (!colors) { return }

    const colorNames = Object.keys(colors)
    const renderedColors = colorNames.map((key) => `${cssVariableName(key)}: ${colors[key]}`).join(';')
    const renderedOnColors = colorNames.map((key) => `${cssVariableName(`on-${key}`)}: ${getColor(getTextColor(colors[key]))}`).join(';')

    return `${renderedColors};${renderedOnColors}`
  }

  const renderCSSVariablesStyleContent = (colors: ColorVariables = configColors) => {
    const colorNames = Object.keys(colors)

    let result = ':root {\n'
    colorNames.forEach((key) => {
      result += generateCSSVariable(key, colors[key])
    })
    colorNames.forEach((key) => {
      result += generateCSSVariable(`on-${key}`, getColor(getTextColor(colors[key])))
    })
    result += '}\n'

    return result
  }

  const uniqueId = computed(generateUniqueId)

  const updateColors = (newValue: ColorVariables | undefined) => {
    if (!newValue) { return }
    if (isServer()) { return }

    if (!isStyleTag.value) {
      const colorNames = Object.keys(newValue)

      const root = document.documentElement
      colorNames.forEach((key) => {
        setCSSVariable(key, newValue[key], root)
      })
      colorNames.forEach((key) => {
        setCSSVariable(`on-${key}`, getColor(getTextColor(newValue[key])), root)
      })
    } else {
      const styleContent = renderCSSVariablesStyleContent(newValue)

      addOrUpdateStyleElement(`va-color-variables-${uniqueId.value}`, () => styleContent)
    }
  }

  watch(configColors, (newValue) => {
    updateColors(newValue)
  }, { immediate: true, deep: true })

  return {
    isStyleTag,
    colors: configColors,
    currentPresetName,
    renderCSSVariables,
    updateColors,
    renderCSSVariablesStyleContent,
  }
}
