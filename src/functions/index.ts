import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import twilio from 'twilio';

const callSid2data = new Map<string, { tree: string[]; hangup: boolean }>();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  console.log(JSON.stringify(event, undefined, 2));
  if (event.body === undefined) throw new Error('No body');
  const body = new URLSearchParams(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body);
  console.log(body);

  const callSid = body.get('CallSid')!;

  const voiceRes = new twilio.twiml.VoiceResponse();

  switch (body.get('CallStatus')) {
    case 'ringing': {
      callSid2data.set(callSid, { tree: [], hangup: false });
      const gather = voiceRes.gather({ numDigits: 1, actionOnEmptyResult: true });
      gather.say('Press 1 for 1\nPress 2 for 2\nPress 3 for 3');
      voiceRes.redirect('/');
      break;
    }
    case 'in-progress': {
      const data = callSid2data.get(callSid)!;
      if (data.hangup) {
        voiceRes.hangup();
      } else {
        const digit = body.get('Digits')!;
        if (['1', '2', '3'].includes(digit)) data.tree.push(digit);
        if (data.tree.length === 3 && data.tree.every((node) => node === '3')) {
          voiceRes.say('Start recording for 6 seconds after Bee, press # key to stop.');
          voiceRes.record({ maxLength: 6, finishOnKey: '#', playBeep: true });
          data.hangup = true;
        } else {
          const prefix = data.tree.join('.');
          const gather = voiceRes.gather({ numDigits: 1, actionOnEmptyResult: true });
          gather.say(`Press 1 for ${prefix}.1\nPress 2 for ${prefix}.2\nPress 3 for ${prefix}.3`);
        }
      }
      voiceRes.redirect('/');
      break;
    }
    case 'completed': {
      callSid2data.delete(callSid);
      break;
    }
    default: {
      throw new Error('Unhandled CallStatus: ' + body.get('CallStatus'));
    }
  }

  const xml = voiceRes.toString();
  console.log(xml);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
    body: xml,
  };
};
