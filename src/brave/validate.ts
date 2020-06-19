import * as fsLib from 'fs'
import * as pathLib from 'path'
import * as urlLib from 'url'

import { getLoggerForLevel } from './debug.js'

const isUrl = (possibleUrl: string): boolean => {
  try {
    (new urlLib.URL(possibleUrl))  // eslint-disable-line
    return true
  } catch (_) {
    return false
  }
}

const isFile = (path: string): boolean => {
  return fsLib.existsSync(path) && fsLib.lstatSync(path).isFile()
}

const isDir = (path: string): boolean => {
  if (!fsLib.existsSync(path)) {
    return false
  }

  const pathStats = fsLib.lstatSync(path)
  if (pathStats.isDirectory()) {
    return true
  }

  if (pathStats.isSymbolicLink()) {
    return isDir(pathLib.join(path, pathLib.sep))
  }

  return false
}

const looksWriteable = (path: string): boolean => {
  const pathDir = pathLib.dirname(path)
  if (!isDir(pathDir)) {
    return false
  }

  if (isDir(path)) {
    return false
  }

  return true
}

export const validate = (rawArgs: any): ValidationResult => {
  const logger = getLoggerForLevel(rawArgs.debug)
  logger.debug('Received arguments: ', rawArgs)

  if (!isFile(rawArgs.binary)) {
    return [false, `Invalid path to Brave binary: ${rawArgs.binary}`]
  }
  const executablePath: FilePath = rawArgs.binary

  if (!looksWriteable(rawArgs.output)) {
    return [false, `Invalid path to write results to: ${rawArgs.output}`]
  }
  const outputPath: FilePath = rawArgs.output

  const passedUrlArgs: string[] = rawArgs.url
  if (!passedUrlArgs.every(isUrl)) {
    return [false, `Found invalid URL: ${passedUrlArgs.join(', ')}`]
  }
  const urls: Url[] = passedUrlArgs
  const secs: number = rawArgs.secs

  const validatedArgs = {
    executablePath,
    outputPath,
    urls,
    seconds: secs,
    withShieldsUp: (rawArgs.shields === 'up'),
    debugLevel: rawArgs.debug,
    existingProfilePath: undefined,
    persistProfilePath: undefined
  }

  if (rawArgs.existing_profile && rawArgs.persist_profile) {
    return [false, 'Cannot specify both that you want to use an existing ' +
                   'profile, and that you want to persist a new profile.']
  }

  if (rawArgs.existing_profile) {
    if (!isDir(rawArgs.existing_profile)) {
      return [false, 'Provided existing profile path is not a directory: ' +
                     `${rawArgs.existing_profile}.`]
    }
    validatedArgs.existingProfilePath = rawArgs.existing_profile
  }

  if (rawArgs.persist_profile) {
    if (isDir(rawArgs.persist_profile) || isFile(rawArgs.persist_profile)) {
      return [false, 'File already exists at path for persisting a ' +
                     `profile: ${rawArgs.persist_profile}.`]
    }
    validatedArgs.persistProfilePath = rawArgs.persist_profile
  }

  logger.debug('Running with settings: ', validatedArgs)
  return [true, Object.freeze(validatedArgs)]
}