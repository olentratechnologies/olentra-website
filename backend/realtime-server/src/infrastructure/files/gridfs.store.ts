import { GridFSBucket, type Db } from "mongodb";

/** Service-local GridFS adapter preserving the existing bucket naming convention. */
export function createGridFsStore(db: Db, bucketName: string) {
  const bucket = new GridFSBucket(db, { bucketName });
  return {
    bucket,
    bucketName,
    openUploadStreamWithId: bucket.openUploadStreamWithId.bind(bucket),
    openDownloadStream: bucket.openDownloadStream.bind(bucket),
    delete: bucket.delete.bind(bucket),
  };
}
