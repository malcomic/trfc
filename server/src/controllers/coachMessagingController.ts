import { Request, Response } from 'express'
import { assertParticipantInProgram, CoachAccessError } from '../utils/coachAccess.js'
import {
  CoachMessagingError,
  findConversation,
  getOrCreateConversation,
  listInboxForCoach,
  listMessages,
  markConversationRead,
  postMessage,
  unreadCountForCoach,
} from '../utils/coachMessaging.js'

function coachId(req: Request): string {
  return req.user!.id
}

function handleError(res: Response, error: unknown) {
  if (error instanceof CoachAccessError || error instanceof CoachMessagingError) {
    return res.status(error.status).json({ error: error.message })
  }
  console.error(error)
  return res.status(500).json({ error: 'Something went wrong' })
}

export async function getInbox(req: Request, res: Response) {
  try {
    const items = await listInboxForCoach(coachId(req))
    res.json({ items })
  } catch (error) {
    handleError(res, error)
  }
}

export async function getInboxUnreadCount(req: Request, res: Response) {
  try {
    const count = await unreadCountForCoach(coachId(req))
    res.json({ count })
  } catch (error) {
    handleError(res, error)
  }
}

export async function getThread(req: Request, res: Response) {
  try {
    const { program, enrollment } = await assertParticipantInProgram(
      coachId(req),
      req.params.userId,
      req.params.program
    )
    const conversation = await findConversation(program.id, enrollment.user_id)
    if (!conversation) {
      return res.json({
        conversation: null,
        messages: [],
      })
    }
    await markConversationRead(conversation.id, coachId(req))
    const messages = await listMessages(conversation.id, coachId(req))
    res.json({
      conversation: {
        id: conversation.id,
        programId: conversation.program_id,
        participantId: conversation.participant_id,
        lastMessageAt: conversation.last_message_at,
      },
      messages,
    })
  } catch (error) {
    handleError(res, error)
  }
}

export async function postThreadMessage(req: Request, res: Response) {
  try {
    const { program, enrollment } = await assertParticipantInProgram(
      coachId(req),
      req.params.userId,
      req.params.program
    )
    const conversation = await getOrCreateConversation(program.id, enrollment.user_id)
    const message = await postMessage({
      conversationId: conversation.id,
      senderId: coachId(req),
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
    })
  } catch (error) {
    handleError(res, error)
  }
}
