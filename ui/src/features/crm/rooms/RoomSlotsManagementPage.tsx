import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { RoomSlotsCalendar } from './RoomSlotsCalendar';
import { RoomSlotsGenerator } from './RoomSlotsGenerator';
import { useAppSelector } from '@/features/crm/hooks';

interface RoomSlotsPageProps {
  roomId?: number;
  onClose?: () => void;
}

export const RoomSlotsPage: React.FC<RoomSlotsPageProps> = ({ roomId, onClose }) => {
  const { user } = useAppSelector((state) => state.auth);
  const rooms = useAppSelector((state) => state.rooms.items) as any[];
  
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(roomId || null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedRoom = rooms.find(r => r.room_id === selectedRoomId);
  const centerId = user?.center_id;

  if (!centerId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to determine center ID. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Room Slots Management</h1>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Room Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Room</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {rooms.map(room => (
              <Button
                key={room.room_id}
                variant={selectedRoomId === room.room_id ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => setSelectedRoomId(room.room_id)}
              >
                {room.room_number}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Slots Management */}
      {selectedRoom ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Room {selectedRoom.room_number} - Slots & Bookings</CardTitle>
              <RoomSlotsGenerator
                roomId={selectedRoom.room_id}
                centerId={centerId}
                onSlotsGenerated={() => setRefreshKey(prev => prev + 1)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div key={refreshKey}>
              <Tabs defaultValue="calendar" className="w-full">
                <TabsList>
                  <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                  <TabsTrigger value="info">Info</TabsTrigger>
                </TabsList>
                
                <TabsContent value="calendar" className="mt-4">
                  <RoomSlotsCalendar
                    roomId={selectedRoom.room_id}
                    centerId={centerId}
                    roomNumber={selectedRoom.room_number}
                  />
                </TabsContent>
                
                <TabsContent value="info" className="mt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold text-sm text-gray-600">Room Number</h3>
                        <p className="text-lg">{selectedRoom.room_number}</p>
                      </div>
                      {selectedRoom.class_name && (
                        <div>
                          <h3 className="font-semibold text-sm text-gray-600">Associated Class</h3>
                          <p className="text-lg">{selectedRoom.class_name}</p>
                        </div>
                      )}
                      {selectedRoom.day && (
                        <div>
                          <h3 className="font-semibold text-sm text-gray-600">Regular Day</h3>
                          <p className="text-lg">{selectedRoom.day}</p>
                        </div>
                      )}
                      {selectedRoom.time && (
                        <div>
                          <h3 className="font-semibold text-sm text-gray-600">Regular Time</h3>
                          <p className="text-lg">{selectedRoom.time}</p>
                        </div>
                      )}
                    </div>
                    
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Use the Calendar View tab to manage slots and bookings for this room. 
                        Click on a date to create new slots or view existing ones.
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a room to view and manage its slots and bookings.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
