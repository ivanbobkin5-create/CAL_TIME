import React, { useState } from "react";
import { Lock } from "lucide-react";

export const AdminLoginForm = ({ onLogin }: { onLogin: (password: string) => void }) => {
  const [password, setPassword] = useState("");
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900/50">
      <div className="p-6 bg-white rounded-lg shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Вход для администратора</h2>
        <input 
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          placeholder="Введите пароль"
        />
        <button 
          onClick={() => onLogin(password)}
          className="w-full p-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Войти
        </button>
      </div>
    </div>
  );
};
