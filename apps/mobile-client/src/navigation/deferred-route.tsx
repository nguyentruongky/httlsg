import { restoreLocalReads } from "@org/core";
import { useQueryClient } from "@tanstack/react-query";
import { createElement, type ComponentType, type ComponentProps } from "react";
import { PageErrorBoundary } from "../page-error-boundary";

/** Load once, share in-flight imports, and recover failed chunks through the page boundary. */
export function deferred<T extends ComponentType<any>>(load: () => Promise<T>) {
  let component: T | undefined;
  let flight: Promise<void> | undefined;
  const preload = () =>
    (flight ??= load()
      .then((value) => {
        component = value;
      })
      .catch((error) => {
        flight = undefined;
        if (
          navigator.onLine &&
          /dynamically imported|loading chunk|module script|failed to fetch/i.test(
            String(error),
          )
        ) {
          const key = "church:chunk-reload:" + location.pathname;
          try {
            if (!sessionStorage.getItem(key)) {
              sessionStorage.setItem(key, "1");
              location.reload();
            }
          } catch {
            /* Let the error boundary offer retry. */
          }
        }
        throw error;
      }));
  function Component(props: ComponentProps<T>) {
    const client = useQueryClient();
    if (!component) throw preload();
    return createElement(PageErrorBoundary, {
      recoverLocalData: () => restoreLocalReads(client),
      children: createElement(component as ComponentType<any>, props),
    });
  }
  return { Component, preload };
}
