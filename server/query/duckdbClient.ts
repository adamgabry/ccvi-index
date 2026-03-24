import os from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api'

const currentDir = dirname(fileURLToPath(import.meta.url))

export const parquetPath = resolve(currentDir, '../../data/scores.parquet')

let connectionPromise: Promise<DuckDBConnection> | null = null

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return Number(value)
  }

  return value
}

async function createConnection(): Promise<DuckDBConnection> {
  const threadCount = Math.max(1, Math.min(os.cpus().length, 8))
  const instance = await DuckDBInstance.create(':memory:', {
    threads: String(threadCount),
    preserve_insertion_order: 'false',
  })

  const maybeConnectable = instance as DuckDBInstance & {
    connect?: () => Promise<DuckDBConnection>
  }

  if (typeof maybeConnectable.connect === 'function') {
    return maybeConnectable.connect()
  }

  return DuckDBConnection.create(instance)
}

export async function getDuckDbConnection(): Promise<DuckDBConnection> {
  connectionPromise ??= createConnection()
  return connectionPromise
}

export async function runQuery<T extends Record<string, unknown>>(sql: string): Promise<T[]> {
  const connection = await getDuckDbConnection()
  const reader = await connection.runAndReadAll(sql)
  const columnNames = reader.columnNames()
  const rows = reader.getRows() as unknown[]

  return rows.map((row) => {
    if (!Array.isArray(row)) {
      return row as T
    }

    return Object.fromEntries(
      columnNames.map((columnName, index) => [columnName, normalizeValue(row[index])]),
    ) as T
  })
}
