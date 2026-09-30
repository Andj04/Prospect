import { useEffect, useState } from "react";

// Retarde la propagation d'une valeur (typiquement un champ de recherche) :
// le filtrage ne se relance qu'une fois la frappe terminée.
export function useDebounced<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
