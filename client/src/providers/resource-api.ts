import type { App, InjectionKey } from 'vue'

import type { ResourceApi } from '../types/resource-api'

/**
 * Injection key for the Dog's Business Resource API.
 *
 * @beta
 */
export const RESOURCE_API_INJECTION_KEY = Symbol() as InjectionKey<ResourceApi>

/**
 * Provider for the Dog's Business Resource API.
 *
 * @remarks
 *
 * A Vue plugin that provides a given instance of {@link ResourceApi} as the
 * Dog's Business Resource API.
 *
 * @beta
 */
export class ResourceApiProvider {
  constructor(private readonly resourceApi: ResourceApi) {}

  install(app: App) {
    app.provide(RESOURCE_API_INJECTION_KEY, this.resourceApi)
  }
}
