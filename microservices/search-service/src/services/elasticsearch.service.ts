/**
 * Elasticsearch Service
 */

import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ProductDocument, SearchRequest, SearchResult, AutocompleteResult, Suggestion } from '../types';

let client: Client | null = null;

export async function connectElasticsearch(): Promise<void> {
  try {
    client = new Client({
      node: config.elasticsearch.url,
      auth: config.elasticsearch.username ? {
        username: config.elasticsearch.username,
        password: config.elasticsearch.password,
      } : undefined,
    });

    const health = await client.cluster.health({});
    logger.info('Connected to Elasticsearch', { status: health.status });

    // Create index if not exists
    await createIndexIfNotExists();
  } catch (error: any) {
    logger.error('Failed to connect to Elasticsearch', { error: error.message });
    throw error;
  }
}

async function createIndexIfNotExists(): Promise<void> {
  if (!client) throw new Error('Elasticsearch not connected');

  const indexName = config.search.indexName;
  const exists = await client.indices.exists({ index: indexName });

  if (!exists) {
    await client.indices.create({
      index: indexName,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          analysis: {
            analyzer: {
              product_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding', 'product_synonyms', 'product_stemmer'],
              },
              autocomplete_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding', 'autocomplete_filter'],
              },
            },
            filter: {
              product_synonyms: {
                type: 'synonym',
                synonyms: [
                  'phone, mobile, cellphone',
                  'laptop, notebook, computer',
                  'tv, television, telly',
                ],
              },
              product_stemmer: {
                type: 'stemmer',
                language: 'english',
              },
              autocomplete_filter: {
                type: 'edge_ngram',
                min_gram: 1,
                max_gram: 20,
              },
            },
          },
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            name: {
              type: 'text',
              analyzer: 'product_analyzer',
              fields: {
                keyword: { type: 'keyword' },
                autocomplete: {
                  type: 'text',
                  analyzer: 'autocomplete_analyzer',
                },
              },
            },
            description: { type: 'text', analyzer: 'product_analyzer' },
            shortDescription: { type: 'text' },
            category: { type: 'keyword' },
            subcategory: { type: 'keyword' },
            brand: { type: 'keyword' },
            sellerId: { type: 'keyword' },
            sellerName: { type: 'text' },
            price: { type: 'float' },
            originalPrice: { type: 'float' },
            discount: { type: 'float' },
            rating: { type: 'float' },
            reviewCount: { type: 'integer' },
            soldCount: { type: 'integer' },
            stock: { type: 'integer' },
            isActive: { type: 'boolean' },
            isFeatured: { type: 'boolean' },
            isFlashSale: { type: 'boolean' },
            flashSaleEndTime: { type: 'date' },
            tags: { type: 'keyword' },
            variants: {
              type: 'nested',
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' },
                sku: { type: 'keyword' },
                price: { type: 'float' },
                stock: { type: 'integer' },
              },
            },
            images: { type: 'keyword' },
            attributes: { type: 'object', enabled: false },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
      },
    });
    logger.info('Created Elasticsearch index', { indexName });
  }
}

export async function indexProduct(product: ProductDocument): Promise<void> {
  if (!client) throw new Error('Elasticsearch not connected');

  await client.index({
    index: config.search.indexName,
    id: product.id,
    body: product,
    refresh: true,
  });

  logger.debug('Indexed product', { productId: product.id });
}

export async function bulkIndexProducts(products: ProductDocument[]): Promise<void> {
  if (!client) throw new Error('Elasticsearch not connected');

  const operations = products.flatMap((product) => [
    { index: { _index: config.search.indexName, _id: product.id } },
    product,
  ]);

  const result = await client.bulk({ body: operations, refresh: true });

  if (result.errors) {
    const erroredDocuments = result.items.filter((item) => item.index?.error);
    logger.error('Bulk indexing errors', { errors: erroredDocuments });
  }

  logger.info('Bulk indexed products', { count: products.length });
}

export async function deleteProduct(productId: string): Promise<void> {
  if (!client) throw new Error('Elasticsearch not connected');

  try {
    await client.delete({
      index: config.search.indexName,
      id: productId,
      refresh: true,
    });
    logger.debug('Deleted product from index', { productId });
  } catch (error: any) {
    if (error.meta?.statusCode !== 404) {
      throw error;
    }
  }
}

export async function search(request: SearchRequest): Promise<SearchResult> {
  if (!client) throw new Error('Elasticsearch not connected');

  const page = request.page || 1;
  const limit = Math.min(request.limit || 20, config.search.maxResults);
  const from = (page - 1) * limit;

  const must: any[] = [
    { term: { isActive: true } },
  ];

  const filter: any[] = [];

  // Full-text search
  if (request.query) {
    must.push({
      multi_match: {
        query: request.query,
        fields: ['name^3', 'description^2', 'brand^2', 'category', 'tags', 'sellerName'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    });
  }

  // Category filter
  if (request.category) {
    filter.push({ term: { category: request.category } });
  }

  // Brand filter
  if (request.brand) {
    filter.push({ term: { brand: request.brand } });
  }

  // Price range
  if (request.minPrice !== undefined || request.maxPrice !== undefined) {
    const range: any = { price: {} };
    if (request.minPrice !== undefined) range.price.gte = request.minPrice;
    if (request.maxPrice !== undefined) range.price.lte = request.maxPrice;
    filter.push({ range });
  }

  // Rating filter
  if (request.rating !== undefined) {
    filter.push({ range: { rating: { gte: request.rating } } });
  }

  // Stock filter
  if (request.filters?.inStock) {
    filter.push({ range: { stock: { gt: 0 } } });
  }

  // Flash sale filter
  if (request.filters?.flashSale) {
    filter.push({ term: { isFlashSale: true } });
  }

  // Sorting
  let sort: any[] = [];
  switch (request.sortBy) {
    case 'price_asc':
      sort = [{ price: 'asc' }];
      break;
    case 'price_desc':
      sort = [{ price: 'desc' }];
      break;
    case 'rating':
      sort = [{ rating: 'desc' }];
      break;
    case 'popularity':
      sort = [{ soldCount: 'desc' }];
      break;
    case 'newest':
      sort = [{ createdAt: 'desc' }];
      break;
    default:
      sort = request.query ? ['_score', { soldCount: 'desc' }] : [{ soldCount: 'desc' }];
  }

  const response = await client.search({
    index: config.search.indexName,
    body: {
      from,
      size: limit,
      query: {
        bool: {
          must,
          filter,
        },
      },
      sort,
      aggs: {
        categories: {
          terms: { field: 'category', size: 20 },
        },
        brands: {
          terms: { field: 'brand', size: 20 },
        },
        price_ranges: {
          range: {
            field: 'price',
            ranges: [
              { key: 'Under $10', to: 10 },
              { key: '$10 - $50', from: 10, to: 50 },
              { key: '$50 - $100', from: 50, to: 100 },
              { key: '$100 - $500', from: 100, to: 500 },
              { key: 'Over $500', from: 500 },
            ],
          },
        },
        ratings: {
          range: {
            field: 'rating',
            ranges: [
              { key: '4+ Stars', from: 4 },
              { key: '3+ Stars', from: 3 },
              { key: '2+ Stars', from: 2 },
              { key: '1+ Stars', from: 1 },
            ],
          },
        },
      },
    },
  });

  const hits = response.hits.hits;
  const total = typeof response.hits.total === 'number'
    ? response.hits.total
    : response.hits.total?.value || 0;

  const aggs = response.aggregations as any;

  return {
    products: hits.map((hit: any) => hit._source as ProductDocument),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    aggregations: {
      categories: aggs?.categories?.buckets || [],
      brands: aggs?.brands?.buckets || [],
      priceRanges: aggs?.price_ranges?.buckets || [],
      ratings: aggs?.ratings?.buckets || [],
    },
    took: response.took,
  };
}

export async function autocomplete(query: string): Promise<AutocompleteResult> {
  if (!client) throw new Error('Elasticsearch not connected');

  const response = await client.search({
    index: config.search.indexName,
    body: {
      size: 0,
      query: {
        bool: {
          must: [
            { term: { isActive: true } },
            {
              multi_match: {
                query,
                fields: ['name.autocomplete', 'brand', 'category'],
                type: 'bool_prefix',
              },
            },
          ],
        },
      },
      aggs: {
        products: {
          top_hits: {
            size: 5,
            _source: ['id', 'name'],
          },
        },
        categories: {
          terms: { field: 'category', size: 3 },
        },
        brands: {
          terms: { field: 'brand', size: 3 },
        },
      },
    },
  });

  const aggs = response.aggregations as any;
  const suggestions: Suggestion[] = [];

  // Product suggestions
  if (aggs?.products?.hits?.hits) {
    aggs.products.hits.hits.forEach((hit: any) => {
      suggestions.push({
        text: hit._source.name,
        score: hit._score || 0,
        type: 'product',
      });
    });
  }

  // Category suggestions
  if (aggs?.categories?.buckets) {
    aggs.categories.buckets.forEach((bucket: any) => {
      suggestions.push({
        text: bucket.key,
        score: bucket.doc_count,
        type: 'category',
      });
    });
  }

  // Brand suggestions
  if (aggs?.brands?.buckets) {
    aggs.brands.buckets.forEach((bucket: any) => {
      suggestions.push({
        text: bucket.key,
        score: bucket.doc_count,
        type: 'brand',
      });
    });
  }

  return {
    suggestions: suggestions.slice(0, config.search.suggestionLimit),
    took: response.took,
  };
}

export async function getSimilarProducts(productId: string, limit: number = 5): Promise<ProductDocument[]> {
  if (!client) throw new Error('Elasticsearch not connected');

  const response = await client.search({
    index: config.search.indexName,
    body: {
      size: limit,
      query: {
        more_like_this: {
          fields: ['name', 'description', 'category', 'tags', 'brand'],
          like: [
            {
              _index: config.search.indexName,
              _id: productId,
            },
          ],
          min_term_freq: 1,
          min_doc_freq: 1,
        },
      },
    },
  });

  return response.hits.hits.map((hit: any) => hit._source as ProductDocument);
}

export async function closeClient(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}

export default {
  connectElasticsearch,
  indexProduct,
  bulkIndexProducts,
  deleteProduct,
  search,
  autocomplete,
  getSimilarProducts,
  closeClient,
};
