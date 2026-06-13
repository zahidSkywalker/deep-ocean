import { NextRequest, NextResponse } from 'next/server'
import { saveQuizResult } from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, topicId, classLevel, score, totalQuestions, answers } = body

    if (!studentId || !topicId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const resultId = await saveQuizResult({
      studentId,
      topicId,
      classLevel,
      score: score || 0,
      totalQuestions: totalQuestions || 0,
      answers: answers || [],
    })

    return NextResponse.json({
      success: true,
      resultId,
      message: 'Quiz result saved successfully',
    })
  } catch (error) {
    console.error('Error saving quiz result:', error)
    return NextResponse.json(
      { error: 'Failed to save quiz result' },
      { status: 500 }
    )
  }
}
