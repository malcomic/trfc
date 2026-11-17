import { Request, Response } from 'express'
import { getAssignedCoach } from '../utils/coachAccess.js'
import {
  CoachMessagingError,
  findConversation,
  getOrCreateConversation,
  listMessages,
  markConversationRead,
  postMessage,
  unreadCountForParticipant,
} from '../utils/coachMessaging.js'
import { findProgram, getPublishedContent } from '../utils/programCatalog.js'
import { requireEnrollment } from '../utils/programProgress.js'

async function enrolledProgramId(req: Request, res: Response): Promise<string | null> {
  const row = await findProgram(req.params.program)
  if (!row) {
    res.status(400).json({ error: 'Unknown program' })
    return null
  }
  if (!(await requireEnrollment(req.user!.id, row.id))) {
    res.status(403).json({ error: 'Join this program first' })
    return null
  }
  const content = await getPublishedContent(row.id)
  if (!content) {
    res.status(404).json({ error: 'This program is not ready yet' })
    return null
  }
  return row.id
}

function handleError(res: Response, error: unknown) {
  if (error instanceof CoachMessagingError) {
    return res.status(error.status).json({ error: error.message })
  }
  console.error(error)
  return res.status(500).json({ error: 'Something went wrong' })
}

export async function getProgramMessages(req: Request, res: Response) {
  try {
    const programId = await enrolledProgramId(req, res)
    if (!programId) return

    const coach = await getAssignedCoach(programId)
    if (!coach) {
      return res.json({ conversation: null, messages: [], coach: null, unreadCount: 0 })
    }

    const conversation = await findConversation(programId, req.user!.id)
    if (!conversation) {
      return res.json({ conversation: null, messages: [], coach, unreadCount: 0 })
    }

    const unreadCount = await unreadCountForParticipant(req.user!.id, programId)
    await markConversationRead(conversation.id, req.user!.id)
    const messages = await listMessages(conversation.id, req.user!.id)
    res.json({
      conversation: {
        id: conversation.id,
        programId: conversation.program_id,
        participantId: conversation.participant_id,
        lastMessageAt: conversation.last_message_at,
      },
      messages,
      coach,
      unreadCount,
    })
  } catch (error) {
    handleError(res, error)
  }
}

export async function postProgramMessage(req: Request, res: Response) {
  try {
    const programId = await enrolledProgramId(req, res)
    if (!programId) return

    const coach = await getAssignedCoach(programId)
    if (!coach) {
      return res.status(400).json({ error: 'No coach is assigned to this program yet' })
    }

    const conversation = await getOrCreateConversation(programId, req.user!.id)
    const message = await postMessage({
      conversationId: conversation.id,
      senderId: req.user!.id,
      body: req.body?.body,
    })
    res.status(201).json({
      conversation: {
        id: conversation.id,
        programId: conversation.program_id,
        participantId: conversation.participant_id,
        lastMessageAt: conversation.last_message_at,
      },
      message,
      coach,
    })
  } catch (error) {
    handleError(res, error)
  }
}

export async function getProgramMessagesUnreadCount(req: Request, res: Response) {
  try {
    const programId = await enrolledProgramId(req, res)
    if (!programId) return
    const count = await unreadCountForParticipant(req.user!.id, programId)
    res.json({ count })
  } catch (error) {
    handleError(res, error)
  }
}
