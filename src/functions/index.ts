import { Handler } from 'aws-lambda';

export const handler: Handler = async (event, context) => {
  console.log(JSON.stringify(event));

  const callId: string = event.CallDetails?.Participants?.[0]?.CallId;
  let tree: string = event.CallDetails?.TransactionAttributes?.tree;
  let actions: Record<string, unknown>[];
  switch (event.InvocationEventType) {
    case 'NEW_INBOUND_CALL': {
      actions = [speakAndGetDigits({ callId: callId, text: 'Press 1 for 1\nPress 2 for 2\nPress 3 for 3' })];
      break;
    }
    case 'RINGING': {
      actions = [];
      break;
    }
    case 'HANGUP': {
      actions = [];
      break;
    }
    case 'ACTION_SUCCESSFUL': {
      switch (event.ActionData.Type) {
        case 'SpeakAndGetDigits': {
          const digit = event.ActionData.ReceivedDigits;
          tree = tree === undefined ? digit : `${tree}.${digit}`;
          if (tree === '3.3.3') {
            actions = [speak({ callId, text: `Start recording for 6 seconds after Bee, press any key to stop. Bee` })];
          } else if (['1', '2', '3'].includes(digit)) {
            actions = [
              speakAndGetDigits({
                callId: callId,
                text: Array(3)
                  .fill(undefined)
                  .map((v, i) => `Press ${i + 1} for ${tree}.${i + 1}`)
                  .join('\n'),
              }),
            ];
          } else {
            actions = [hangup({ callId })];
          }
          break;
        }
        case 'Speak': {
          if (tree === '3.3.3') {
            actions = [recordAudio({ callId: callId })];
          } else {
            actions = [hangup({ callId })];
          }
          break;
        }
        case 'RecordAudio': {
          const objectKey = event.ActionData.RecordingDestination.Key;
          actions = [speak({ callId, text: objectKey })];
          break;
        }
        default:
          console.warn(`Unhandled Action Type: ${event.ActionData.Type}`);
          actions = [hangup({ callId })];
          break;
      }
      break;
    }
    case 'ACTION_FAILED': {
      actions = [speak({ callId, text: 'ABC' }), hangup({ callId })];
      break;
    }
    default:
      actions = [
        speak({ callId, text: `Unhandled Invocation Event Type: ${event.InvocationEventType}` }),
        hangup({ callId }),
      ];
  }
  const response = {
    SchemaVersion: '1.0',
    Actions: actions,
    TransactionAttributes: { tree },
  };
  console.log(JSON.stringify(response));
  return response;
};

function speakAndGetDigits(arg: { callId: string; text: string }) {
  return {
    Type: 'SpeakAndGetDigits' as const,
    Parameters: {
      CallId: arg.callId,
      SpeechParameters: {
        Text: arg.text,
      },
      FailureSpeechParameters: {
        Text: 'Timeout',
      },
      MinNumberOfDigits: 1,
      MaxNumberOfDigits: 1,
      RepeatDurationInMilliseconds: 10000,
    },
  };
}

function speak(arg: { callId: string; text: string }) {
  return {
    Type: 'Speak' as const,
    Parameters: {
      CallId: arg.callId,
      Text: arg.text,
    },
  };
}

function hangup(arg: { callId: string }) {
  return {
    Type: 'Hangup' as const,
    Parameters: {
      CallId: arg.callId,
      SipResponseCode: '0',
    },
  };
}

function recordAudio(arg: { callId: string }) {
  return {
    Type: 'RecordAudio' as const,
    Parameters: {
      CallId: arg.callId,
      DurationInSeconds: '6',
      RecordingTerminators: Array.from('123456789*0#'),
      RecordingDestination: {
        Type: 'S3' as const,
        BucketName: 'new-audio-bucket-name-905418194649',
        Prefix: 'recordings/',
      },
    },
  };
}
