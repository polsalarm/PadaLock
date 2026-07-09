import { describe, expect, it } from 'vitest';
import { feedbackGraphIngestUrl } from './feedback-graph';

describe('feedbackGraphIngestUrl', () => {
  it('targets the Vercel API route for feedback-graph ingest', () => {
    expect(feedbackGraphIngestUrl('https://feedback.example.com')).toBe(
      'https://feedback.example.com/api/ingest',
    );
  });

  it('handles trailing slashes in FEEDBACK_GRAPH_URL', () => {
    expect(feedbackGraphIngestUrl('https://feedback.example.com///')).toBe(
      'https://feedback.example.com/api/ingest',
    );
  });
});