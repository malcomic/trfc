import api from './index'
import type { PageVideo } from './pageVideos'

export type WelcomeVideoShown = { show: false } | { show: true; video: PageVideo; showsUsed: number }

/** Counts one showing and returns the video while the member is still eligible. */
export const recordWelcomeVideoShown = async (): Promise<WelcomeVideoShown> =>
  (await api.post('/users/me/welcome-video/shown')).data

export const markWelcomeVideoWatched = async (): Promise<void> => {
  await api.post('/users/me/welcome-video/watched')
}
