/**
 * Shared limits for General Conference import + Firestore rules (keep in sync with firestore.rules).
 */
module.exports = {
  MAX_OUTLINE_MARKDOWN_CHARS: 262144,
  MAX_HTTP_RESPONSE_BYTES: 524288,
  MAX_SPEAKER_CHARS: 500,
  MAX_TITLE_CHARS: 1000,
  MAX_TALK_ID_CHARS: 128,
  FORBIDDEN_TALK_FIELDS: [
    'raw_transcript',
    'formatted_transcript',
    'current_outline',
    'transcript',
    'formattedTranscript',
    'rawTranscript'
  ],
  ALLOWED_TALK_FIELDS: [
    'talkId',
    'speaker',
    'title',
    'start',
    'end',
    'sessionKey',
    'outlineMarkdown',
    'outlineSyncedAt',
    'sourceTalkUrl'
  ]
};
