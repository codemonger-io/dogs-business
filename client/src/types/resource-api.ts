import type { UserInfo } from './account-info'
import type { ApiResponse } from './api-response'

/**
 * Interface representing the Dog's Business Resource API.
 *
 * @beta
 */
export interface ResourceApi {
  /**
   * Obtains the user information associated with a given ID token.
   *
   * @param idToken -
   *
   *   Cognito ID token of the user whose information is to be obtained.
   */
  getCurrentUserInfo(idToken: string): Promise<ApiResponse<UserInfo>>
}
