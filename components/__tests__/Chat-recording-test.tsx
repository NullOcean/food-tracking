import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { Chat } from '../Log/Chat';
import { AudioModule, setAudioModeAsync } from 'expo-audio';
import { transcribeAudio, parseMeal } from '@/services/open-ai';

const mockRecorder = {
  prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
  record: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  uri: 'file:///recording.m4a',
};
jest.mock('expo-audio', () => ({
  useAudioRecorder: () => mockRecorder,
  useAudioRecorderState: () => ({ metering: -40 }),
  RecordingPresets: { HIGH_QUALITY: {} },
  AudioModule: { requestRecordingPermissionsAsync: jest.fn() },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ logMode: 'meal' }) }));
jest.mock('react-redux', () => ({
  useSelector: (select: Function) => select({ food: { meals: [] } }),
  useDispatch: () => jest.fn(),
}));
jest.mock('@/services/open-ai', () => ({
  transcribeAudio: jest.fn(), parseMeal: jest.fn(), parseMealRecipe: jest.fn(), utilizeRecipes: jest.fn(),
}));
jest.mock('../Log/Message', () => ({
  Message: () => null, MessageFrom: { USER: 'Andrew', GPT: 'Nourishly' },
}));
jest.mock('../../svg/speak.svg', () => 'SpeakIcon');
jest.mock('@/state/foodSlice', () => ({ recordMeal: jest.fn() }));
jest.mock('@/state/loggingSessionSlice', () => ({
  appendLoggingMessages: jest.fn(),
  clearLoggingSession: jest.fn(),
}));

let screen: renderer.ReactTestRenderer;
beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({ granted: true } as any);
  jest.mocked(transcribeAudio).mockResolvedValue('two eggs');
  jest.mocked(parseMeal).mockResolvedValue({ error: 'mock response' });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await act(async () => { screen = renderer.create(<Chat onMealRetrieval={() => {}} />); });
});
afterEach(async () => {
  await act(async () => screen.unmount());
  jest.restoreAllMocks();
});
const tapMicrophone = async () => {
  await act(async () => {
    await screen.root.findByType(TouchableOpacity).props.onPress();
  });
};

it('requests permission, records, then uploads the stopped recording URI', async () => {
  await tapMicrophone();
  expect(setAudioModeAsync).toHaveBeenCalledWith({ allowsRecording: true, playsInSilentMode: true });
  expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(1);
  expect(mockRecorder.record).toHaveBeenCalledTimes(1);
  await tapMicrophone();
  expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
  expect(transcribeAudio).toHaveBeenCalledWith('file:///recording.m4a');
  expect(mockRecorder.stop.mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(transcribeAudio).mock.invocationCallOrder[0]);
});

it('does not start recording when microphone permission is denied', async () => {
  jest.mocked(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({ granted: false } as any);
  await tapMicrophone();
  expect(mockRecorder.record).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalled();
});

it('recovers the microphone button after recorder preparation fails', async () => {
  mockRecorder.prepareToRecordAsync.mockRejectedValueOnce(new Error('busy'));
  await tapMicrophone();
  expect(screen.root.findByType(TouchableOpacity).props.disabled).toBe(false);
  expect(screen.root.findByType(TouchableOpacity).props.accessibilityLabel).toBe('Record meal');
  await tapMicrophone();
  expect(mockRecorder.record).toHaveBeenCalledTimes(1);
});
