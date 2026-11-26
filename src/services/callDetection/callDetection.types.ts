export type CallEventType =
  | 'incoming_ringing'
  | 'incoming_active'
  | 'outgoing_detected'
  | 'call_active'
  | 'call_ended'
  | 'call_unanswered';

export interface CallEvent {
  eventId: string;
  eventType: CallEventType;
  timestamp: number;
  callDirection: 'incoming' | 'outgoing' | 'unknown';
  source: 'android_telephony';
  phoneNumber?: string;
}

export type CallEventListener = (event: CallEvent) => void;
