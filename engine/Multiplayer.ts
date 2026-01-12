
import { NetworkMessage } from '../types';

export class MultiplayerManager {
  private peerConnection: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private onMessageCallback: (msg: NetworkMessage) => void;
  private onStatusChange: (status: string) => void;

  constructor(onMessage: (msg: NetworkMessage) => void, onStatus: (status: string) => void) {
    this.onMessageCallback = onMessage;
    this.onStatusChange = onStatus;
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        this.onStatusChange('ICE Gathering Complete. Copy the code below.');
      }
    };
  }

  public async createOffer(): Promise<string> {
    this.dataChannel = this.peerConnection.createDataChannel('game-sync');
    this.setupDataChannel();
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return JSON.stringify(offer);
  }

  public async handleOffer(offerStr: string): Promise<string> {
    const offer = JSON.parse(offerStr);
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    return JSON.stringify(answer);
  }

  public async handleAnswer(answerStr: string) {
    const answer = JSON.parse(answerStr);
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;
    this.dataChannel.onopen = () => this.onStatusChange('Connected!');
    this.dataChannel.onclose = () => this.onStatusChange('Disconnected.');
    this.dataChannel.onmessage = (event) => {
      const msg = JSON.parse(event.data) as NetworkMessage;
      this.onMessageCallback(msg);
    };
  }

  public send(msg: NetworkMessage) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(msg));
    }
  }

  public getStatus(): string {
    return this.peerConnection.iceConnectionState;
  }
}
