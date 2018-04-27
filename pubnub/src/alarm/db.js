
const config = require('../config')

module.exports = {
  clean,
  get,
  listMeta,
  save,
  remove
}

const Database = require('s3-db')
const database = new Database({
  db: {
    ...config.s3db
  },
  provider: {
    ...config.credentials.s3db
  }
  // collections: {
  //   alarms: {
  //     // pageSize: 100 // which is the default
  //   }
  // }
})

// extract enumerable properties without functions, to remove prototype functions from s3-db objects
function clean (o) {
  const c = {}
  for (var p in o) {
    if (typeof o[p] !== 'function') {
      c[p] = o[p]
    }
  }
  return c
}
// collection (bucket) does not need to exist to perform an existence test, (or Head)
// this avoids ensuring collection exists
async function get (collectionName, id) {
  const collection = await database.getCollection(collectionName)
  const exists = await collection.exists(id)
  if (exists) {
    return clean(await collection.getDocument(id))
  }
  return null
}

async function listMeta (collectionName) {
  const collection = await createCollectionIfNotExists(collectionName)
  return (await collection.find()).map(clean)
}
async function save (collectionName, item) {
  const collection = await createCollectionIfNotExists(collectionName)
  return clean(await collection.saveDocument(item))
}

async function remove (collectionName, id) {
  const collection = await createCollectionIfNotExists(collectionName)
  return collection.deleteDocument(id)
}

// Turns out, that it is faster to incur the cost of listing the buckets,
// is slightly faster than a straght createCollection
async function createCollectionIfNotExists (name) {
  // requires list buckets...
  const collections = await database.getCollectionNames()
  // console.log('Database collections', collections)

  if (!collections.includes(name)) {
    const collection = await database.createCollection(name)
    // console.log('collection: (created)', collection.getFQN())
    return collection
  }

  const collection = await database.getCollection(name)
  // console.log('collection: (existing)', collection.getFQN())
  return collection
}
