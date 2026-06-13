import { MongoClient, Db, Collection, ObjectId } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI!
const DB_NAME = 'nctb_physics_lab'

let client: MongoClient | null = null
let db: Db | null = null

export async function getMongoDb(): Promise<Db> {
  if (db) return db

  client = new MongoClient(MONGODB_URI)
  await client.connect()
  db = client.db(DB_NAME)

  // Create indexes
  const collection = db.collection('quiz_results')
  await collection.createIndex({ studentId: 1 })
  await collection.createIndex({ topicId: 1 })
  await collection.createIndex({ createdAt: -1 })

  return db
}

export interface QuizResultDocument {
  _id?: ObjectId
  studentId: string
  topicId: string
  classLevel: number
  score: number
  totalQuestions: number
  answers: {
    questionId: string
    selected: string
    correct: boolean
  }[]
  createdAt: Date
}

export async function saveQuizResult(data: Omit<QuizResultDocument, '_id' | 'createdAt'>) {
  const database = await getMongoDb()
  const collection = database.collection<QuizResultDocument>('quiz_results')
  const doc = {
    ...data,
    createdAt: new Date(),
  }
  const result = await collection.insertOne(doc)
  return result.insertedId
}

export async function getQuizProgress(studentId: string, topicId?: string) {
  const database = await getMongoDb()
  const collection = database.collection<QuizResultDocument>('quiz_results')

  const query: Record<string, unknown> = { studentId }
  if (topicId) query.topicId = topicId

  const results = await collection.find(query).sort({ createdAt: -1 }).toArray()
  return results
}

export async function getBestScores(studentId: string) {
  const database = await getMongoDb()
  const collection = database.collection<QuizResultDocument>('quiz_results')

  const pipeline = [
    { $match: { studentId } },
    { $sort: { score: -1 } },
    {
      $group: {
        _id: '$topicId',
        bestScore: { $first: '$score' },
        totalQuestions: { $first: '$totalQuestions' },
        attempts: { $sum: 1 },
        lastAttempt: { $first: '$createdAt' },
      },
    },
  ]

  const results = await collection.aggregate(pipeline).toArray()
  return results
}
