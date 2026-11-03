import api from './index'
import type { SignupAnswers } from '../content/signupQuestions'

export type StoredAnswers = { [K in keyof SignupAnswers]: string | null } & {
  answers_saved_at: string | null
  answers_updated_at: string | null
}

export async function getMyAnswers(): Promise<StoredAnswers> {
  const response = await api.get<StoredAnswers>('/users/me/answers')
  return response.data
}

export async function updateMyAnswers(answers: Partial<SignupAnswers>): Promise<StoredAnswers> {
  const response = await api.put<StoredAnswers>('/users/me/answers', answers)
  return response.data
}

export async function deleteMyAnswers(): Promise<void> {
  await api.delete('/users/me/answers')
}
