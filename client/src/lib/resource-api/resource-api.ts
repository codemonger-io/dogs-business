import type { ApiResponse } from '../../types/api-response'
import type { HumanFriend } from '../../types/human-friend'

/**
 * Interface of the Dog's Business API that is called on behalf of a specific
 * user.
 *
 * @remarks
 *
 * The implementer of the interface will associate the API calls with the ID
 * token of the user.
 *
 * @beta
 */
export interface AuthenticatedResourceApi {
  /**
   * Obtains the human friends of a given dog.
   */
  getHumanFriendsOfDog(dogId: string): Promise<ApiResponse<HumanFriend[]>>
}
