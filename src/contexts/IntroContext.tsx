"use client";

import { createContext, useContext, type ReactNode } from "react";

type IntroContextType = {
  introActive: boolean;
};

const IntroContext = createContext<IntroContextType>({ introActive: false });

export function IntroProvider({ introActive, children }: { introActive: boolean; children: ReactNode }) {
  return (
    <IntroContext.Provider value={{ introActive }}>
      {children}
    </IntroContext.Provider>
  );
}

export function useIntroContext() {
  return useContext(IntroContext);
}
