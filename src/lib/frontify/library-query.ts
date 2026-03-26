/** Page size for library asset pagination (Frontify `assets` connection). */
export const LIBRARY_ASSETS_PAGE_SIZE = 100;

export const LIBRARY_BY_ID_QUERY = /* GraphQL */ `
  query LibraryById($id: ID!, $limit: Int!, $page: Int!) {
    library(id: $id) {
      assets(limit: $limit, page: $page) {
        total
        hasNextPage
        items {
          id
          externalId
          title
          ... on Asset {
            targets {
              name
            }
            customMetadata {
              property {
                id
                name
              }
              ... on CustomMetadataValue {
                value
              }
              ... on CustomMetadataValues {
                values
              }
            }
          }
          ... on Image {
            extension
            previewUrl
            width
            height
          }
          ... on Video {
            extension
            previewUrl
            downloadUrl
          }
          ... on Audio {
            extension
            previewUrl
            downloadUrl
          }
          ... on File {
            extension
            previewUrl
            downloadUrl
          }
          ... on Document {
            extension
            previewUrl
            downloadUrl
          }
        }
      }
    }
  }
`;
