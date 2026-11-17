import { query } from '../config/db.js'

export const MESSAGE_MAX_LENGTH = 4000
export const INBOX_LIMIT = 100
export const THREAD_MESSAGE_LIMIT = 200

export class CoachMessagingError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

export function normalizeMessageBody(body: unknown): string {
  if (typeof body !== 'string') {
    throw new CoachMessagingError('Message body is required', 400)
  }
  const trimmed = body.trim()
  if (!trimmed) throw new CoachMessagingError('Message cannot be empty', 400)
  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    throw new CoachMessagingError(`Message must be ${MESSAGE_MAX_LENGTH} characters or fewer`, 400)
  }
  return trimmed
}

export async function getOrCreateConversation(programId: string, participantId: string) {
  const existing = await query(
    `SELECT id, program_id, participant_id, created_at, last_message_at
     FROM coach_conversations
     WHERE program_id = $1 AND participant_id = $2`,
    [programId, participantId]
  )
  if (existing.rows[0]) return existing.rows[0]

  const inserted = await query(
    `INSERT INTO coach_conversations (program_id, participant_id)
     VALUES ($1, $2)
     ON CONFLICT (program_id, participant_id) DO UPDATE SET program_id = EXCLUDED.program_id
     RETURNING id, program_id, participant_id, created_at, last_message_at`,
    [programId, participantId]
  )
  return inserted.rows[0]
}

export async function findConversation(programId: string, participantId: string) {
  const result = await query(
    `SELECT id, program_id, participant_id, created_at, last_message_at
     FROM coach_conversations
     WHERE program_id = $1 AND participant_id = $2`,
    [programId, participantId]
  )
  return result.rows[0] ?? null
}

export function mapMessage(row: {
  id: string
  sender_id: string
  body: string
  created_at: string | Date
  read_at: string | Date | null
}, viewerId: string) {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
    mine: row.sender_id === viewerId,
  }
}

export async function listMessages(conversationId: string, viewerId: string, limit = THREAD_MESSAGE_LIMIT) {
  const result = await query(
    `SELECT id, sender_id, body, created_at, read_at
     FROM coach_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [conversationId, limit]
  )
  return result.rows.map((r) => mapMessage(r, viewerId))
}

export async function postMessage(input: {
  conversationId: string
  senderId: string
  body: string
}) {
  const body = normalizeMessageBody(input.body)
  const inserted = await query(
    `INSERT INTO coach_messages (conversation_id, sender_id, body)
     VALUES ($1, $2, $3)
     RETURNING id, sender_id, body, created_at, read_at`,
    [input.conversationId, input.senderId, body]
  )
  await query(`UPDATE coach_conversations SET last_message_at = NOW() WHERE id = $1`, [
    input.conversationId,
  ])
  return mapMessage(inserted.rows[0], input.senderId)
}

export async function markConversationRead(conversationId: string, viewerId: string) {
  await query(
    `UPDATE coach_messages
     SET read_at = NOW()
     WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
    [conversationId, viewerId]
  )
}

export async function unreadCountForCoach(coachId: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*)::int AS cnt
     FROM coach_messages m
     JOIN coach_conversations c ON c.id = m.conversation_id
     JOIN coach_program_assignments a ON a.program_id = c.program_id AND a.coach_id = $1
     WHERE m.sender_id = c.participant_id AND m.read_at IS NULL`,
    [coachId]
  )
  return Number(result.rows[0]?.cnt ?? 0)
}

export async function unreadCountForParticipant(userId: string, programId?: string): Promise<number> {
  const params: unknown[] = [userId]
  let programFilter = ''
  if (programId) {
    params.push(programId)
    programFilter = ` AND c.program_id = $2`
  }
  const result = await query(
    `SELECT COUNT(*)::int AS cnt
     FROM coach_messages m
     JOIN coach_conversations c ON c.id = m.conversation_id
     WHERE c.participant_id = $1
       AND m.sender_id <> $1
       AND m.read_at IS NULL${programFilter}`,
    params
  )
  return Number(result.rows[0]?.cnt ?? 0)
}

export async function listInboxForCoach(coachId: string) {
  const result = await query(
    `SELECT c.id, c.program_id, c.participant_id, c.last_message_at,
            p.slug AS program_slug, p.name AS program_name,
            u.name AS participant_name,
            (
              SELECT m.body FROM coach_messages m
              WHERE m.conversation_id = c.id
              ORDER BY m.created_at DESC LIMIT 1
            ) AS last_body,
            (
              SELECT COUNT(*)::int FROM coach_messages m
              WHERE m.conversation_id = c.id
                AND m.sender_id = c.participant_id
                AND m.read_at IS NULL
            ) AS unread_count
     FROM coach_conversations c
     JOIN coach_program_assignments a ON a.program_id = c.program_id AND a.coach_id = $1
     JOIN programs p ON p.id = c.program_id
     JOIN users u ON u.id = c.participant_id
     ORDER BY c.last_message_at DESC
     LIMIT $2`,
    [coachId, INBOX_LIMIT]
  )
  return result.rows.map((r) => ({
    conversationId: r.id,
    programId: r.program_id,
    programSlug: r.program_slug,
    programName: r.program_name,
    participantId: r.participant_id,
    participantName: r.participant_name,
    lastMessageAt: r.last_message_at,
    lastMessagePreview: r.last_body ?? '',
    unreadCount: Number(r.unread_count ?? 0),
  }))
}
