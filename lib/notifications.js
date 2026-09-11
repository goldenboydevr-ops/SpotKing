import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(userId) {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SpotKing',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E8C84A',
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'your-expo-project-id', // filled in at runtime from app config
    })).data;

    if (token && userId) {
      await supabase.from('push_tokens').upsert({ user_id: userId, token, updated_at: new Date().toISOString() });
    }
    return token;
  } catch (e) {
    console.warn('Push token error:', e.message);
    return null;
  }
}

// Send push to another user via Expo Push API
export async function sendPushToUser(toUserId, title, body, data = {}) {
  try {
    const { data: row } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', toUserId)
      .single();

    if (!row?.token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: row.token,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
      }),
    });
  } catch (e) {
    console.warn('Push send error:', e.message);
  }
}

// Store in-app notification in Supabase
export async function createNotification(userId, type, fromUserId, spotId = null, mediaId = null) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      from_user_id: fromUserId,
      spot_id: spotId,
      media_id: mediaId,
    });
  } catch (e) {
    console.warn('Notification insert error:', e.message);
  }
}
