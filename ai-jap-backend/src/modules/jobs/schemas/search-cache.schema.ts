import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SearchCacheDocument = HydratedDocument<SearchCache>;

@Schema({ timestamps: true, collection: 'search_cache' })
export class SearchCache {
  @Prop({ required: true, unique: true, index: true })
  cacheKey: string;

  @Prop({ type: [Object], default: [] })
  scrapedJobs: any[]; // Array of partial Job objects (title, company, url, description, etc)

  @Prop({ required: true, index: { expires: '6h' } }) // TTL index: auto delete after 6 hours
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const SearchCacheSchema = SchemaFactory.createForClass(SearchCache);
