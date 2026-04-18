import React from 'react';
import { router } from 'expo-router';
import '../src/web-shell/bank-shell.css';

export default function SharedSpacesWebPage() {
  return (
    <div className="bank-shell-shared-page">
      <div className="bank-shell-shared-card">
        <h1>Shared Spaces</h1>
        <p>
          Заглушка для следующей части демо. Кнопка на главном экране теперь встроена в интерфейс аккуратно:
          на desktop/tablet рядом с “Pridať widget”, на mobile как круглая кнопка “+” над нижней иконкой.
        </p>
        <button className="bank-shell-secondary" type="button" onClick={() => router.push('/')}>Back</button>
      </div>
    </div>
  );
}
