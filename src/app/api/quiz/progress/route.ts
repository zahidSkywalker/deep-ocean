import { NextRequest, NextResponse } from 'next/server'
import { getBestScores } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const topicId = searchParams.get('topicId')

    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing studentId' },
        { status: 400 }
      )
    }

    const progress = await getBestScores(studentId, topicId || undefined)

    return NextResponse.json({
      success: true,
      progress,
    })
  } catch (error) {
    console.error('Error fetching quiz progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    )
  }
}
