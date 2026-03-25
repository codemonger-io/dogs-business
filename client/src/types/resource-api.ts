
import type { UserInfo } from './account-info'
import type { ApiResponse } from './api-response'
import type { HumanFriend } from './human-friend'

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

  /**
   * Obtains human friends of a given dog.
   *
   * @param idToken -
   *
   *   Cognito ID token of the user who makes the request on behalf of the dog.
   *
   * @param dogId -
   *
   *   ID of the dog.
   */
  getHumanFriendsOfDog(idToken: string, dogId: string): Promise<ApiResponse<HumanFriend[]>>
}
