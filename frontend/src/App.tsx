import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css'; // Para los estilos

// Definición de la interfaz para un Gasto
interface Expense {
  id: number;
  amount: number;
  description: string;
  dateRecorded: string;
}

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>(''); // Nuevo estado para el término de búsqueda

  const API_URL = 'http://localhost:3000/api/expenses'; // URL de tu backend

  // Función para cargar los gastos
  const fetchExpenses = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Expense[] = await response.json();
      // Ordenar por fecha (más reciente primero)
      const sortedData = data.sort((a, b) => new Date(b.dateRecorded).getTime() - new Date(a.dateRecorded).getTime());
      setExpenses(sortedData);
    } catch (error) {
      console.error('Error al obtener gastos:', error);
      alert('Error al cargar los gastos. Revisa la consola del navegador y el backend.');
    }
  }, []); // Dependencias vacías, solo se crea una vez

  // Cargar gastos al iniciar la aplicación
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]); // Dependencia en fetchExpenses (es useCallback, así que no causará bucle infinito)

  // Filtra los gastos basándose en el término de búsqueda
  const filteredExpenses = useMemo(() => {
    if (!searchTerm) {
      return expenses;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return expenses.filter(
      (expense) =>
        expense.description.toLowerCase().includes(lowerCaseSearchTerm) ||
        expense.amount.toString().includes(lowerCaseSearchTerm) ||
        new Date(expense.dateRecorded).toLocaleDateString().includes(lowerCaseSearchTerm)
    );
  }, [expenses, searchTerm]); // Se recalcula cuando expenses o searchTerm cambian

  // Calcula el total de gastos filtrados (se actualiza dinámicamente)
  const totalFilteredExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]); // Se recalcula cuando filteredExpenses cambian

  // Función para añadir un nuevo gasto
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === '' || description.trim() === '') {
      alert('Por favor, ingresa un monto y una descripción.');
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: Number(amount), description }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setAmount(''); // Limpiar el campo de monto
      setDescription(''); // Limpiar el campo de descripción
      fetchExpenses(); // Vuelve a cargar los gastos para actualizar la lista y el total
    } catch (error) {
      console.error('Error al añadir gasto:', error);
      alert('Error al añadir el gasto. Revisa la consola del navegador y el backend.');
    }
  };

  // Función para eliminar un gasto
  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
      return; // El usuario canceló la eliminación
    }
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      fetchExpenses(); // Recargamos para asegurar consistencia y actualizar total
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      alert('Error al eliminar el gasto. Revisa la consola del navegador y el backend.');
    }
  };

  return (
    <div className="container">
      <h1>Rastreador de Gastos</h1>

      <form onSubmit={handleAddExpense} className="expense-form animated-fade-in">
        <input
          type="number"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          step="0.01"
          min="0.01" // No permitir montos negativos o cero
          required
        />
        <input
          type="text"
          placeholder="Descripción (ej. Café, Comida)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={50} // Limitar longitud para descripciones cortas
        />
        <button type="submit">Añadir Gasto</button>
      </form>

      <div className="total-expenses animated-fade-in">
        <h2>Total de Gastos (filtrados): ${totalFilteredExpenses.toFixed(2)}</h2>
      </div>

      <div className="filter-section animated-fade-in">
        <input
          type="text"
          placeholder="Filtrar por descripción, monto o fecha..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="expense-list animated-fade-in">
        <h2>Mis Gastos ({filteredExpenses.length} de {expenses.length})</h2>
        {filteredExpenses.length === 0 && expenses.length > 0 && (
            <p>No se encontraron gastos que coincidan con su búsqueda.</p>
        )}
        {expenses.length === 0 ? (
          <p>No hay gastos registrados. ¡Empieza a añadir algunos!</p>
        ) : (
          <ul>
            {filteredExpenses.map((expense) => (
              <li key={expense.id} className="expense-item animated-slide-in">
                <span className="expense-info">
                  <span className="expense-amount">${expense.amount.toFixed(2)}</span>
                  <span className="expense-description">{expense.description}</span>
                  <small className="expense-date">{new Date(expense.dateRecorded).toLocaleDateString()}</small>
                </span>
                <button onClick={() => handleDeleteExpense(expense.id)} className="delete-button">
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;