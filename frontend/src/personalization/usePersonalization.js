import { useContext } from "react";
import { PersonalizationContext } from "./context";

export function usePersonalization() {
  return useContext(PersonalizationContext);
}