import React, { useState } from 'react';

type DisplayState = 'laps' | 'time' | 'reset';
// Define the shape of the props the component expects
interface DisplayControllerProps {
    socket: WebSocket | null;
    connectionStatus: string;
}
export const DisplayController: React.FC<DisplayControllerProps> = ({ socket, connectionStatus }) => {
    const [localStatus, setLocalStatus] = useState<string>('Ready');

    const sendControlCommand = (command: DisplayState, state: boolean) => {
    // Guard clause: check if socket is passed and actually open
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        setLocalStatus('Error: Server connection is offline.');
        return;
    }

    const payload = {
        type: 'control',    
        target: 'sideposition',
        action: {[command]: state},
        timestamp: Date.now(),
    };

    // Send using the parent's WebSocket instance
    socket.send(JSON.stringify(payload));
    setLocalStatus(`Sent: ${command}`);
    };

    return (
    <div className="max-w-sm mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100 text-center font-sans">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Display Remote Control</h2>

      {/* Connection indicator badge */}
        <div className="mb-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
            {connectionStatus === 'connected' ? '● Connected' : '● Offline'}
            </span>
        </div>

        <div className="flex flex-col gap-3">
            <button 
            onClick={() => sendControlCommand('laps',true)} 
            disabled={connectionStatus !== 'connected'}
            className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
            Show Laps
            </button>

            <button 
            onClick={() => sendControlCommand('laps',false)} 
            disabled={connectionStatus !== 'connected'}
            className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
            Hide Laps
            </button>
            
            <button 
            onClick={() => sendControlCommand('time',true)} 
            disabled={connectionStatus !== 'connected'}
            className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
            Show Time
            </button>

            <button 
            onClick={() => sendControlCommand('time',false)} 
            disabled={connectionStatus !== 'connected'}
            className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
            Hide Time
            </button>

            <button 
            onClick={() => sendControlCommand('reset',true)} 
            disabled={connectionStatus !== 'connected'}
            className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-slate-500 hover:bg-slate-600 active:bg-slate-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
            Reset Display
            </button>
        </div>

        <div className="mt-6 p-3 bg-gray-50 rounded-md text-sm text-gray-600 border border-gray-200">
            <span className="font-semibold text-gray-700">Last Action:</span> {localStatus}
        </div>
        </div>
    );
};

export default DisplayController;