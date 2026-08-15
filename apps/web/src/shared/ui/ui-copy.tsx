import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { DEFAULT_UI_LABELS } from "@karaoke/contracts";

type UiCopyContextValue = {
  text: (key: string, variables?: Record<string, string | number>) => string;
};

const UiCopyContext = createContext<UiCopyContextValue>({
  text: (key) => DEFAULT_UI_LABELS[key] ?? key
});

function renderTemplate(template: string, variables: Record<string, string | number>) {
  return template.replace(/{{(\w+)}}/g, (match, variable) => String(variables[variable] ?? match));
}

export function UiCopyProvider({
  labels,
  children
}: PropsWithChildren<{
  labels?: Record<string, string>;
}>) {
  const value = useMemo<UiCopyContextValue>(() => ({
    text: (key, variables = {}) => renderTemplate(labels?.[key] || DEFAULT_UI_LABELS[key] || key, variables)
  }), [labels]);

  return <UiCopyContext.Provider value={value}>{children}</UiCopyContext.Provider>;
}

export function useUiCopy() {
  return useContext(UiCopyContext).text;
}
