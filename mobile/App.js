import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import ReportScreen from './screens/ReportScreen';
import TrackScreen from './screens/TrackScreen';
import IssueDetails from './screens/IssueDetails';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TrackStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="TrackHome" component={TrackScreen} options={{ title: 'Track' }} />
      <Stack.Screen name="IssueDetails" component={IssueDetails} options={{ title: 'Issue Details' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#667eea',
          tabBarInactiveTintColor: 'gray',
          tabBarIcon: ({ color, size }) => {
            let iconName = 'home';
            if (route.name === 'Report') iconName = 'add-circle';
            if (route.name === 'Track') iconName = 'search';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Report" component={ReportScreen} />
        <Tab.Screen name="Track" component={TrackStack} options={{ headerShown: false }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
