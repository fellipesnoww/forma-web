import { apiFetch } from '@/shared/api/client'

export type RatingPlatform = 'mobile' | 'web'

/** 1–5, whole numbers only. */
export type RatingRank = 1 | 2 | 3 | 4 | 5

export interface Rating {
  id: string
  rank: RatingRank
  /** Blank text comes back as `null`. */
  observation: string | null
  platform: RatingPlatform
  device: string
  /** Set by the server when the rating is saved. */
  date: string
}

export interface CreateRatingInput {
  rank: RatingRank
  /** Up to 2000 chars. */
  observation?: string | null
  platform: RatingPlatform
  /** 1–120 chars after trimming: browser + OS on the web. */
  device: string
}

/** Fase 5.4: any signed-in user can rate the app, as many times as they like. Write-only for the app. */
export const ratingsApi = {
  create: (body: CreateRatingInput) => apiFetch<Rating>('/ratings', { method: 'POST', json: body }),
}
