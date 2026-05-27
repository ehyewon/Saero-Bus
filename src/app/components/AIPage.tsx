import { useState } from 'react';
import { SmartToy, Send } from '@mui/icons-material';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '안녕하세요! 버스 AI 어시스턴트입니다. 버스 노선, 도착 시간, 최적 경로 등 무엇이든 물어보세요!',
    },
  ]);
  const [input, setInput] = useState('');

  const suggestedQuestions = [
    '강남역에서 서울역 가는 버스 알려줘',
    '지금 타면 30분 안에 도착할 수 있는 버스는?',
    '140번 버스 첫차와 막차 시간은?',
    '심야버스 노선 알려줘',
  ];

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages([...messages, userMessage]);

    setTimeout(() => {
      const responses = [
        '140번, 146번 버스를 이용하시면 됩니다. 140번은 약 25분, 146번은 약 28분 소요됩니다.',
        '현재 위치 기준으로 301번 버스가 3분 후 도착 예정이며, 목적지까지 22분이 소요됩니다.',
        '140번 버스는 첫차 05:30, 막차 23:00이며, 배차간격은 10-15분입니다.',
        'N13, N16, N26번 등의 심야버스가 운행 중입니다. 자세한 노선을 알려드릴까요?',
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const assistantMessage: Message = { role: 'assistant', content: randomResponse };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);

    setInput('');
  };

  const handleSuggestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="size-full bg-gray-50 flex flex-col">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col pb-20">
        {/* Header */}
        <div className="bg-white p-4 shadow-sm flex items-center gap-2">
          <SmartToy className="text-blue-600" sx={{ fontSize: 28 }} />
          <h1 className="text-xl font-bold">AI 어시스턴트</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white shadow-sm text-gray-900'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="pt-4">
              <p className="text-xs text-gray-500 mb-3">추천 질문</p>
              <div className="space-y-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestion(question)}
                    className="w-full text-left bg-white rounded-xl px-4 py-3 text-sm text-gray-700 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="메시지를 입력하세요..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-3 outline-none text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send sx={{ fontSize: 20 }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
