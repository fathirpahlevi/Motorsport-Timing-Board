import React, { useEffect, useState, useRef } from 'react';
import { ListSelectInput, SelectOption } from './lists';
import { RiderResult, ControlState } from '../types';
import { getPagedRiders } from '../data';
import { AddRiderModal } from './manualRider';

interface DisplayControllerProps {
    socket: WebSocket | null;
    connectionStatus: string;
    syncState: ControlState;
    inputVideo: string;
    errorMessage: string;
    inputDevices: SelectOption[];
    passSpeedHiveUrl: (passedSpeedHiveUrl:string) => void;
    raceTitle: string;
    sessionName: string;
    groupName: string;
    globalRaceLaps: number;
    globalLaps: number;
    globalLtg: number;
    finishedPages: number;
    riders?: RiderResult[];
}

export const DisplayController: React.FC<DisplayControllerProps> = ({ 
    socket, 
    connectionStatus, 
    syncState, 
    inputVideo, 
    errorMessage, 
    inputDevices, 
    passSpeedHiveUrl, 
    raceTitle, 
    sessionName, 
    groupName, 
    globalRaceLaps, 
    globalLaps, 
    globalLtg,
    finishedPages,
    riders = []}) => {
    const [localStatus, setLocalStatus] = useState<string>('Ready');
    const [gapDiff,setGapDiff] = useState<'gap'|'diff'>('diff');
    const [speedhiveUrl,setSpeedhiveUrl] = useState<string>('');
    const [customBanner,setCustomBanner] = useState<string>('');

    useEffect(() =>{
        
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setLocalStatus('Error: Server connection is offline.');
            return;
        }
        
        const payload = {
            type: 'customBanner',
            text: customBanner
        };

        // Send using the parent's WebSocket instance
        socket.send(JSON.stringify(payload));
        setLocalStatus(`Sent Text: ${customBanner}`);

    },[customBanner])
    const [isModalOpen, setIsModalOpen] = useState(false);
    const finishedPagesNum = useRef<number>(0);
    const pageNum = useRef<number>(0);
    const startControl = useRef<boolean>(false);
    
    const finishControl = useRef<boolean>(false);

    
    const customControl = useRef<boolean>(false);
    
    
    useEffect(() => {
        if(speedhiveUrl.length > 0){
            passSpeedHiveUrl(speedhiveUrl);
        }
    }, [speedhiveUrl]);
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [raceLaps,setRaceLaps] = useState<number>(0);
    const [riderManualData, setRiderManualData] = useState<RiderResult[]>([]);
    useEffect(() =>{
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setLocalStatus('Error: Server connection is offline.');
            return;
        }

        const payload = {
            type: 'setRaceLaps',    
            target: 'sideposition',
            laps: raceLaps,
            timestamp: Date.now(),
        };

        // Send using the parent's WebSocket instance
        socket.send(JSON.stringify(payload));
        setLocalStatus(`Sent: set race laps ${raceLaps}`);

    },[raceLaps]);

    const timingOptions: Array<{ id: 'lapCount' | 'lastLap' | 'gap' | 'interval' | 'bestTime'; label: string }> = [
        { id: 'lapCount', label: 'Lap' },
        { id: 'lastLap', label: 'Last' },
        { id: 'gap', label: 'Gap' },
        { id: 'interval', label: 'Int' },
        { id: 'bestTime', label: 'Best' },
    ];

    const currentTimingMode: 'lapCount' | 'lastLap' | 'gap' | 'interval' | 'bestTime' =
        (syncState?.timingMode as any) ||
        (syncState?.best ? 'bestTime' : syncState?.racerLap ? 'lapCount' : syncState?.lastLap ? 'lastLap' : syncState?.gap ? 'gap' : syncState?.diff ? 'interval' : 'gap');

    const isTimingVisible: boolean =
        syncState?.timingVisible !== undefined ? !!syncState.timingVisible : !!syncState?.time;

    const handleSelectTimingMode = (mode: 'lapCount' | 'lastLap' | 'gap' | 'interval' | 'bestTime') => {
        sendControlCommand('timingMode', mode);
        if (mode === 'gap') {
            sendControlCommand('gap', true);
            sendControlCommand('diff', false);
        } else if (mode === 'interval') {
            sendControlCommand('diff', true);
            sendControlCommand('gap', false);
        } else if (mode === 'bestTime') {
            sendControlCommand('best', true);
        } else if (mode === 'lapCount') {
            sendControlCommand('racerLap', true);
        } else if (mode === 'lastLap') {
            sendControlCommand('lastLap', true);
        }
    };

    const handleToggleTimingVisible = (visible: boolean) => {
        sendControlCommand('timingVisible', visible);
        sendControlCommand('time', visible);
    };

    const currentTowerPage: number = typeof syncState?.sidePositionPage === 'number' ? syncState.sidePositionPage : 0;
    const towerPagination = getPagedRiders(riders || [], currentTowerPage);

    const handlePrevTowerPage = () => {
        const newPage = Math.max(0, currentTowerPage - 1);
        sendControlCommand('sidePositionPage', newPage);
    };

    const handleNextTowerPage = () => {
        const maxPage = towerPagination.totalPages > 0 ? towerPagination.totalPages - 1 : currentTowerPage + 1;
        const newPage = Math.min(maxPage, currentTowerPage + 1);
        sendControlCommand('sidePositionPage', newPage);
    };

    const sendControlCommand = (command: string, state: boolean | string | number) => {
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
        setLocalStatus(`Sent: ${command} = ${state}`);
    };
    
    const sendStartingGrid= (next : boolean) => {
    // Guard clause: check if socket is passed and actually open
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setLocalStatus('Error: Server connection is offline.');
            return;
        }

        const payload = {
            type: 'startingGrid',
            next: true
        };
        
        if(next){
            socket.send(JSON.stringify(payload));
            setLocalStatus(`Sent Page number: ${pageNum.current}`);
        }
        // Send using the parent's WebSocket instance
    };
    
    const sendFinishedPage= (next : boolean) => {
    // Guard clause: check if socket is passed and actually open
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setLocalStatus('Error: Server connection is offline.');
            return;
        }
        if(next){
            if(pageNum.current === (finishedPages -1)){
                pageNum.current = finishedPages - 1;
            }
            else{
                pageNum.current = (pageNum.current + 1);
            }
        }else{
            if(pageNum.current === 0){
                pageNum.current = 0;
            }
            else{
                pageNum.current = pageNum.current - 1;
            }
        }

        const payload = {
            type: 'finishedRacerPage',
            page: pageNum.current
        };

        // Send using the parent's WebSocket instance
        socket.send(JSON.stringify(payload));
        setLocalStatus(`Sent Page number: ${pageNum.current}`);
    };
    const [inputURL,setInputURL] = useState<string>('');
    const handleURLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputURL(e.target.value); // update state on every keystroke
    };
    const sendVideoURL = (url: string) => {
    // Guard clause: check if socket is passed and actually open
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setLocalStatus('Error: Server connection is offline.');
            return;
        }

        const payload = {
            type: 'videoURL',    
            target: 'sideposition',
            url: url,
            timestamp: Date.now(),
        };

        // Send using the parent's WebSocket instance
        socket.send(JSON.stringify(payload));
        setLocalStatus(`Sent: ${url}`);
    };
    const sendSpeedhiveURL = (url: string) => {
    // Guard clause: check if socket is passed and actually open
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setLocalStatus('Error: Server connection is offline.');
            return;
        }

        const payload = {
            type: 'speedhiveURL',    
            target: 'sideposition',
            url: url,
            timestamp: Date.now(),
        };

        // Send using the parent's WebSocket instance
        socket.send(JSON.stringify(payload));
        setLocalStatus(`Sent: Connect Speedhive URL`);
    };

    const sendShutdownSession = () => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setLocalStatus('Error: Server connection is offline.');
            return;
        }
        socket.send(JSON.stringify({
            type: 'sessionControl',
            action: 'shutdown',
            timestamp: Date.now(),
        }));
        setLocalStatus('Sent: Shutdown SignalR Session');
    };

    const sendReconnectSession = () => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setLocalStatus('Error: Server connection is offline.');
            return;
        }
        socket.send(JSON.stringify({
            type: 'sessionControl',
            action: 'reconnect',
            url: speedhiveUrl,
            timestamp: Date.now(),
        }));
        setLocalStatus('Sent: Reconnect SignalR Session');
    };
    const sendInputDevice = (obj: Object) =>{
        
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            setLocalStatus('Error: Server connection is offline.');
            return;
        }

        const payload = {
            type: 'inputDevice',    
            target: 'sideposition',
            device: obj,
            timestamp: Date.now(),
        };

        // Send using the parent's WebSocket instance
        socket.send(JSON.stringify(payload));
        setLocalStatus(`Sent: ${obj}`);
    }
    return (
    <div className='flex flex-col gap-2'>
        <div className="max-w lg:w-5xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100 text-center font-sans">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Display Remote Control</h2>

        {/* Connection indicator badge */}
            <div className="mb-4">
                <span className={`inline-flex items-center px-4 py-0.5 rounded-full text-2xl font-mono ${
                connectionStatus === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {connectionStatus === 'connected' ? '● Connected' : '● Offline'}
                </span>
            </div>
            <div className="w-full flex flex-col text-left mb-6">
                <h1 className="text-xl font-bold text-gray-800 ">Race Information</h1>
                <h2 className="text-lg text-gray-800 ">Event Name: <span className="text-lg font-bold text-gray-900">{raceTitle}</span></h2>
                <h2 className="text-lg text-gray-800 ">Group Name: <span className="text-lg font-bold text-gray-900">{groupName}</span></h2>
                <h2 className="text-lg text-gray-800 ">Session Name: <span className="text-lg font-bold text-gray-900">{sessionName}</span></h2>
                <h2 className="text-lg text-gray-800 ">Race Laps: <span className="text-lg font-bold text-gray-900">{globalRaceLaps}</span></h2>
                <h2 className="text-lg text-gray-800 ">Lap: <span className="text-lg font-bold text-gray-900">{globalLaps}</span></h2>
                <h2 className="text-lg text-gray-800 ">Laps to Go: <span className="text-lg font-bold text-gray-900">{globalLtg}</span></h2>
            </div>

            <div className='grid grid-cols-3 gap-5 mb-7'>
                <div className='flex flex-col gap-3'>
                    {/* <button 
                    onClick={() => {
                            sendControlCommand("input",true);
                            sendControlCommand("rtmp",false);
                    }} 
                    disabled={connectionStatus !== 'connected' || syncState.input}
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-400 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    VIDEO INPUT
                    </button> */}

                    <button 
                    onClick={() => {
                            sendControlCommand("rtmp",true);
                            sendControlCommand("input",false);}} 
                    disabled={connectionStatus !== 'connected' || syncState.rtmp}
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-rose-500 hover:bg-rose-600 active:bg-rose-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    RTMP
                    </button>
                    {syncState.input && (
                    <div className='flex flex-col gap-3'>
                        <ListSelectInput
                            label="Target Input Device"
                            options={inputDevices}
                            selectedValue={selectedDevice}
                            onChange={(val) => {
                            setSelectedDevice(val);
                            console.log('Selected input device:', val);
                            }}
                        />
                        
                        <button 
                        onClick={() => sendInputDevice(selectedDevice)} 
                        disabled={connectionStatus !== 'connected'}
                        className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 active:bg-rose-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                        Set VIDEO INPUT
                        </button>
                        
                        <div className="flex flex-row mb-4 text-left gap-3">
                            <h2 className='font-medium text-gray-800'>Video Status :</h2>
                            <span className={`mr-0 ml-auto inline-flex items-center px-2 py-0.5 text-md font-mono ${
                            inputVideo === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {inputVideo}
                            {/* {inputVideo === 'connected' ? 'Connected' : 'Offline'} */}
                            </span>
                        </div>
                        {errorMessage && (<div className='px-2 text-left bg-red-100 text-red-800 text-sm'>{errorMessage}</div>)}
                    </div>)}
                    {syncState.rtmp && (
                    <div className='flex flex-col gap-1.5 w-full font-sans text-left text-wrap'>
                        <h2 className='font-medium text-gray-800 font-semibold'>URL Example:</h2>
                        <p className="text-sm">http://<span className="text-red-500 font-bold">localhost</span>:8889/<span className="text-red-500 font-bold">live/stream</span>/whep</p>
                        <p className="text-sm">http://<span className="text-red-500 font-bold">192.168.8.147</span>:8889/<span className="text-red-500 font-bold">live/drone1</span>/whep</p>
                        <label className="text-sm font-semibold text-gray-700">
                        Set the RTMP URL
                        </label>
                        <input className="w-full mb-1 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm font-medium text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" placeholder="e.g. http://..." type="text" onChange={handleURLChange}>
                        </input>

                        
                        <button 
                        onClick={() => sendVideoURL(inputURL)
                        } 
                        disabled={connectionStatus !== 'connected'}
                        className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 active:bg-rose-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                        Set VIDEO URL
                        </button>
                        
                        <div className="flex flex-row mb-4 text-left gap-3">
                            <h2 className='font-medium text-gray-800'>Video Status :</h2>
                            <span className={`mr-0 ml-auto inline-flex items-center px-2 py-0.5 text-md font-mono ${
                            inputVideo === 'playing' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {inputVideo}
                            {/* {inputVideo === 'connected' ? 'Connected' : 'Offline'} */}
                            </span>
                        </div>
                    </div>)}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    
                    <button 
                    onClick={() => sendControlCommand('position',true)} 
                    disabled={connectionStatus !== 'connected'}
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    Show Position
                    </button>

                    <button 
                    onClick={() => sendControlCommand('position',false)} 
                    disabled={connectionStatus !== 'connected'}
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    Hide Position
                    </button>

                    {/* TOWER TIMING COLUMN SELECTOR & DISPLAY */}
                    <div className="col-span-2 flex flex-col gap-2.5 p-3.5 bg-zinc-100 border border-zinc-300 rounded-xl my-1">
                      <div className="flex items-center justify-between">
                        <span className="uppercase text-gray-700 font-bold text-xs tracking-wider">
                          Timing/Lap Control
                        </span>
                        <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                          isTimingVisible ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                        }`}>
                          Status: {isTimingVisible ? 'VISIBLE' : 'HIDDEN'}
                        </span>
                      </div>

                      {/* 5 HORIZONTAL SELECTOR BUTTONS */}
                      <div className="grid grid-cols-5 gap-1.5 w-full">
                        {timingOptions.map((opt) => {
                          const isActive = currentTimingMode === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSelectTimingMode(opt.id)}
                              disabled={connectionStatus !== 'connected'}
                              className={`py-2.5 px-1 text-center font-bold text-xs uppercase rounded transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 font-black'
                                  : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* SHOW AND HIDE BUTTONS */}
                      <div className="grid grid-cols-2 gap-2 mt-0.5">
                        <button
                          type="button"
                          onClick={() => handleToggleTimingVisible(true)}
                          disabled={connectionStatus !== 'connected'}
                          className={`w-full py-2.5 px-4 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                            isTimingVisible
                              ? 'bg-emerald-600 ring-2 ring-emerald-400 font-black shadow-md'
                              : 'bg-emerald-500 hover:bg-emerald-600'
                          } disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed`}
                        >
                          Show
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleTimingVisible(false)}
                          disabled={connectionStatus !== 'connected'}
                          className={`w-full py-2.5 px-4 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                            !isTimingVisible
                              ? 'bg-rose-600 ring-2 ring-rose-400 font-black shadow-md'
                              : 'bg-rose-500 hover:bg-rose-600'
                          } disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed`}
                        >
                          Hide
                        </button>
                      </div>
                    </div>

                    {/* TOWER RACERS PAGINATION CONTROL (MAX 19) */}
                    <div className="col-span-2 flex flex-col gap-2.5 p-3.5 bg-zinc-100 border border-zinc-300 rounded-xl my-1">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="uppercase text-gray-700 font-bold text-xs tracking-wider">
                            Racers ({riders?.length || 0} Total)
                          </span>
                          <span className="text-[11px] text-zinc-500 font-medium">
                            {towerPagination.pageRangeText ? `Showing: P${towerPagination.pageRangeText}` : 'All shown'}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-red-500">
                          Page {towerPagination.currentPage + 1} / {towerPagination.totalPages}
                        </span>
                      </div>

                      {/* SIMPLE PREVIOUS AND NEXT BUTTONS */}
                      <div className="grid grid-cols-2 gap-2 mt-0.5">
                        <button
                          type="button"
                          onClick={handlePrevTowerPage}
                          disabled={connectionStatus !== 'connected' || towerPagination.currentPage <= 0}
                          className="w-full py-3 px-4 text-white font-bold text-xs uppercase tracking-wider rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          ◀ Previous
                        </button>

                        <button
                          type="button"
                          onClick={handleNextTowerPage}
                          disabled={connectionStatus !== 'connected' || towerPagination.currentPage >= towerPagination.totalPages - 1}
                          className="w-full py-3 px-4 text-white font-bold text-xs uppercase tracking-wider rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Next ▶
                        </button>
                      </div>
                    </div>

                    <button 
                    onClick={() => {
                        sendControlCommand('ltg',true);
                    }
                    } 
                    disabled={connectionStatus !== 'connected'}
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    Show Laps to go
                    </button>

                    <button 
                    onClick={() => sendControlCommand('ltg',false)} 
                    disabled={connectionStatus !== 'connected'}
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    Hide Laps to go
                    </button>

                    
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
                    onClick={() => sendControlCommand('video',true)} 
                    disabled={connectionStatus !== 'connected'}
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    Show Video
                    </button>

                    <button 
                    onClick={() => sendControlCommand('video',false)} 
                    disabled={connectionStatus !== 'connected'}
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    Hide Video
                    </button>
                    
                    <h1 className='col-span-2 uppercase text-gray-700 font-bold'>Banner Control</h1>

                    <button 
                    onClick={() => {
                        sendControlCommand('start', !startControl.current);
                        startControl.current = !startControl.current;
                    }
                    } 
                    disabled={connectionStatus !== 'connected'}
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    Start
                    </button>

                    <button 
                    onClick={() => {
                        
                        sendControlCommand('finish', !finishControl.current);
                        finishControl.current = !finishControl.current;
                    }} 
                    disabled={connectionStatus !== 'connected'}
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    Finish
                    </button>

{/* 
                    <button 
                    onClick={() => {
                        sendControlCommand('custom', true);
                    }
                    } 
                    disabled={connectionStatus !== 'connected'}
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    Show Custom Text
                    </button>

                    
                    <button 
                    onClick={() => {
                        sendControlCommand('custom', false);
                    }
                    } 
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    Hide Custom Text
                    </button>
                    
                    <textarea
                        value={customBanner}
                        onChange={(e) => setCustomBanner(e.target.value)}
                        placeholder="Paste the custom banner text here ..."
                        className="col-span-2 w-full h-20 border border-zinc-500 p-3 rounded text-xs text-red-600 font-mono focus:outline-none focus:border-red-600 leading-relaxed"
                    />

                    
                    <button
                        onClick={() => {setCustomBanner('')}}
                        className="px-3 py-2.5 col-span-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold uppercase tracking-wider rounded cursor-pointer"
                    >
                        Reset
                    </button> */}



                    <h1 className='col-span-2 uppercase text-gray-700 font-bold'>Starting GRID</h1>
                    <button 
                    onClick={() => sendStartingGrid(true)} 
                    className="w-full py-3 px-6 col-span-2 text-white font-semibold rounded-lg bg-blue-700 hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    Next
                    </button>

                    <h1 className='col-span-2 uppercase text-gray-700 font-bold'>Finished Pages</h1>
                    <button 
                    onClick={() => sendFinishedPage(false)} 
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-pink-500 hover:bg-pink-600 active:bg-pink-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    Previous
                    </button>

                    <button 
                    onClick={() => sendFinishedPage(true)} 
                    className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-purple-500 hover:bg-purple-600 active:bg-pink-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                    Next
                    </button>

                </div>
            <div className='flex flex-col gap-2'>
                        {/* SPEEDHIVE WS FEEDS CONFIG */}
                <div className="space-y-3 p-4 border border-zinc-400 rounded-xl">
                <h3 className="text-xs font-black tracking-widest uppercase text-gray-700 italic flex items-center gap-1.5">
                    Speedhive Live timing URL
                </h3>
                
                <div className="space-y-2">
                    <textarea
                    value={speedhiveUrl}
                    onChange={(e) => setSpeedhiveUrl(e.target.value)}
                    placeholder="Paste Speedhive session URL here..."
                    className="w-full h-20 border border-zinc-500 p-3 rounded text-xs text-red-600 font-mono focus:outline-none focus:border-red-600 leading-relaxed"
                    />
                    <div className="text-[9px] text-zinc-400 font-mono truncate leading-relaxed p-2.5 rounded border border-zinc-850">
                        <strong>Supported Format Example:</strong><br />
                        https://speedhive.mylaps.com/livetiming/BB89C9A089830254-2147485566/sessions/BB89C9A089830254-2147485566-1073745079
                    </div>
                </div>

                    <div className="flex flex-col gap-2 pt-1">
                        <div className="flex gap-2">
                            <button
                            onClick={() => {
                                sendSpeedhiveURL(speedhiveUrl);
                            }}
                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-sans font-black uppercase tracking-wider text-xs rounded transition-all cursor-pointer text-center"
                            >
                            Connect Live Stream
                            </button>
                            {speedhiveUrl && (
                            <button
                                onClick={() => {sendControlCommand('reset',true)}}
                                className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold uppercase tracking-wider rounded cursor-pointer"
                            >
                                Reset
                            </button>
                            )}
                        </div>

                        {/* SignalR Session Control: Shutdown & Reconnect */}
                        <div className="flex gap-2 pt-0.5">
                            <button
                            type="button"
                            onClick={sendShutdownSession}
                            disabled={connectionStatus !== 'connected'}
                            className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-950 text-rose-400 hover:text-rose-300 border border-rose-900/50 font-sans font-bold uppercase tracking-wider text-[11px] rounded transition-all cursor-pointer text-center disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                            title="Shut off the active backend SignalR connection"
                            >
                            🛑 Shutdown Session
                            </button>

                            <button
                            type="button"
                            onClick={sendReconnectSession}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-sans font-bold uppercase tracking-wider text-[11px] rounded transition-all cursor-pointer text-center shadow-sm"
                            title="Reconnect SignalR connection and fetch fresh baseline data"
                            >
                            🔄 Reconnect Session
                            </button>
                        </div>
                    </div>
                    
                    <div className="text-center text-xs font-mono">
                        <div className="p-2.5 border border-zinc-850 rounded">
                            <span className="text-zinc-500 text-[9px] uppercase font-bold block leading-none">Hub Status</span>
                            <span className={`pr-2 font-bold mt-1.5 block flex items-center justify-center gap-1.5 ${
                                connectionStatus === 'connected' 
                                ? 'text-emerald-400' 
                                : connectionStatus === 'connecting' || connectionStatus === 'setting up'
                                    ? 'text-amber-400' 
                                    : 'text-red-500'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                connectionStatus === 'connected' 
                                    ? 'bg-emerald-400 animate-pulse' 
                                    : connectionStatus === 'connecting' 
                                    ? 'bg-amber-400 animate-ping' 
                                    : 'bg-red-500'
                                }`} />
                                {connectionStatus.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Number of Race Laps</label>
                        <input
                            type="number"
                            value={raceLaps}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                setRaceLaps(val);
                            }}
                            className="border border-zinc-800 px-3 py-2 rounded text-xs text-zinc-500 font-mono focus:outline-none focus:border-red-600"
                        />
                        </div>
                    </div>
                    </div>
                </div>
            </div>

            {/* <button 
                onClick={() => sendControlCommand('reset',true)} 
                className="w-full py-3 px-6 text-white font-semibold rounded-lg bg-slate-500 hover:bg-slate-600 active:bg-slate-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
            Reset Display
            </button> */}

            <div className="mt-6 p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-mono block">
                    Broadcast Overlays & Controllers
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <a
                        href="/lowerthirdcontrol"
                        className="p-2.5 bg-amber-400 text-zinc-950 font-bold rounded-lg text-center hover:bg-amber-300 transition-colors uppercase"
                    >
                        Lower Third Control
                    </a>
                    <a
                        href="/lowerthird"
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 bg-zinc-800 text-white font-bold rounded-lg text-center hover:bg-zinc-700 transition-colors uppercase border border-zinc-700"
                    >
                        Lower Third Overlay
                    </a>
                    <a
                        href="/weathercontrol"
                        className="p-2.5 bg-cyan-400 text-zinc-950 font-bold rounded-lg text-center hover:bg-cyan-300 transition-colors uppercase"
                    >
                        Weather Control
                    </a>
                    <a
                        href="/weather"
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 bg-zinc-800 text-white font-bold rounded-lg text-center hover:bg-zinc-700 transition-colors uppercase border border-zinc-700"
                    >
                        Weather Overlay
                    </a>
                    <a
                        href="/manual"
                        className="p-2.5 bg-zinc-800 text-white font-bold rounded-lg text-center hover:bg-zinc-700 transition-colors uppercase border border-zinc-700"
                    >
                        Manual Grid Importer
                    </a>
                    <a
                        href="/sideposition"
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 bg-zinc-800 text-white font-bold rounded-lg text-center hover:bg-zinc-700 transition-colors uppercase border border-zinc-700"
                    >
                        Side Position Overlay
                    </a>
                </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600 border border-gray-200">
                <span className="font-semibold text-gray-700">Last Action:</span> {localStatus}
            </div>
        </div>
        {/* <div className='max-w lg:w-5xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100 text-center font-sans'>
            <h1 className='text-2xl font-bold'>Manual Control</h1>
            <div className='mt-5'>
                
                <div className="space-y-2">
                    <h1>Set Rider Manually</h1>
                    <textarea
                    value={speedhiveUrl}
                    onChange={(e) => {}}
                    placeholder="Paste Speedhive session URL here..."
                    className="w-full h-20 border border-zinc-500 p-3 rounded text-xs text-red-600 font-mono focus:outline-none focus:border-red-600 leading-relaxed"
                    />
                </div>
            </div>
        </div> */}

    </div>
    
);
};

export default DisplayController;