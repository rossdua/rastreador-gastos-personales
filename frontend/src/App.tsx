import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css'; // Asegúrate de que este archivo CSS también esté actualizado

// Interfaz para definir la estructura de un gasto
interface Expense {
  id: number;
  amount: number;
  description: string;
  dateRecorded: string; // La fecha se recibe como string del backend
}

// Interfaz para la respuesta paginada que envía el backend
interface PaginatedExpensesResponse {
  data: Expense[];    // Los gastos de la página actual
  total: number;      // El total de todos los registros en la base de datos
  page: number;       // La página actual
  lastPage: number;   // La última página disponible
}

function App() {
  // Estados para los datos de los gastos y el formulario
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>(''); // Estado para el filtro de búsqueda

  // Estados para la paginación y el estado de carga
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5); // Número de ítems a mostrar por página
  const [totalItemsGlobal, setTotalItemsGlobal] = useState<number>(0); // Total de registros en toda la base de datos
  const [lastPage, setLastPage] = useState<number>(1); // La última página posible
  const [isLoading, setIsLoading] = useState<boolean>(true); // Indica si los datos están cargando

  const API_URL = 'http://localhost:3000/api/expenses'; // URL de tu backend

  // Función para cargar los gastos desde el backend
  // Usa useCallback para evitar que la función se cree en cada render
  const fetchExpenses = useCallback(async () => {
    setIsLoading(true); // Establece isLoading a true al inicio de la carga
    try {
      // Construye la URL con los parámetros de paginación
      const response = await fetch(`${API_URL}?page=${currentPage}&limit=${itemsPerPage}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const paginatedData: PaginatedExpensesResponse = await response.json();

      // Ordena los gastos por fecha (más recientes primero)
      const sortedData = paginatedData.data.sort(
        (a, b) => new Date(b.dateRecorded).getTime() - new Date(a.dateRecorded).getTime()
      );

      // Actualiza los estados con los datos recibidos del backend
      setExpenses(sortedData);
      setTotalItemsGlobal(paginatedData.total);
      setLastPage(paginatedData.lastPage);
    } catch (error) {
      console.error('Error al obtener gastos:', error);
      alert('Error al cargar los gastos. Revisa la consola del navegador y el backend.');
    } finally {
      setIsLoading(false); // Establece isLoading a false al finalizar la carga (éxito o error)
    }
  }, [currentPage, itemsPerPage]); // Las dependencias hacen que la función se re-cree y ejecute cuando cambian

  // Efecto para cargar los gastos la primera vez y cada vez que cambian los parámetros de paginación
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]); // Depende de fetchExpenses (que a su vez depende de currentPage e itemsPerPage)

  // Filtra los gastos basándose en el término de búsqueda actual
  // Usa useMemo para optimizar: solo se recalcula si expenses o searchTerm cambian
  const filteredExpenses = useMemo(() => {
    if (!searchTerm) {
      return expenses; // Si no hay término de búsqueda, muestra todos los gastos de la página actual
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return expenses.filter(
      (expense) =>
        expense.description.toLowerCase().includes(lowerCaseSearchTerm) ||
        expense.amount.toString().includes(lowerCaseSearchTerm) ||
        new Date(expense.dateRecorded).toLocaleDateString().includes(lowerCaseSearchTerm)
    );
  }, [expenses, searchTerm]); // Se recalcula si 'expenses' (de la página actual) o 'searchTerm' cambian

  // Calcula el total de los gastos que están actualmente visibles (filtrados) en la página
  // Usa useMemo para optimizar: solo se recalcula si filteredExpenses cambian
  const totalExpensesOnCurrentPage = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  // Manejador para agregar un nuevo gasto
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault(); // Previene el comportamiento por defecto del formulario
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

      setAmount(''); // Limpia el campo de monto
      setDescription(''); // Limpia el campo de descripción
      fetchExpenses(); // Vuelve a cargar los gastos para actualizar la lista y los totales
    } catch (error) {
      console.error('Error al añadir gasto:', error);
      alert('Error al añadir el gasto. Revisa la consola del navegador y el backend.');
    }
  };

  // Manejador para eliminar un gasto
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

      // Si se eliminó el único elemento de la página actual y no estamos en la primera,
      // retrocede a la página anterior para evitar una página vacía.
      if (filteredExpenses.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchExpenses(); // Recarga los gastos de la página actual
      }
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      alert('Error al eliminar el gasto. Revisa la consola del navegador y el backend.');
    }
  };

  // Renderiza los botones numéricos de paginación
  const renderPaginationButtons = () => {
    const pages = [];
    for (let i = 1; i <= lastPage; i++) {
      pages.push(
        <button
          key={i} // 'key' es importante para la eficiencia de React en listas
          onClick={() => setCurrentPage(i)} // Al hacer clic, cambia la página actual
          className={currentPage === i ? 'pagination-button active' : 'pagination-button'}
          disabled={isLoading} // Deshabilita los botones mientras se está cargando
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <div className="container">
      <h1>Rastreador de Gastos</h1>

      {/* Formulario para añadir gastos */}
      <form onSubmit={handleAddExpense} className="expense-form animated-fade-in">
        <input
          type="number"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          step="0.01" // Permite decimales
          min="0.01" // No permite montos negativos o cero
          required
        />
        <input
          type="text"
          placeholder="Descripción (ej. Café, Comida)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={50} // Limita la longitud de la descripción
        />
        <button type="submit">Añadir Gasto</button>
      </form>

      {/* Sección del total de gastos */}
      <div className="total-expenses animated-fade-in">
        {isLoading ? ( // Muestra mensaje de carga si los datos se están obteniendo
          <h2>Cargando gastos...</h2>
        ) : (
          <>
            <h2>Total de Gastos (página actual): ${totalExpensesOnCurrentPage.toFixed(2)}</h2>
            <p>Total de registros en DB: {totalItemsGlobal}</p> {/* Muestra el total global */}
          </>
        )}
      </div>

      {/* Sección del filtro de búsqueda */}
      <div className="filter-section animated-fade-in">
        <input
          type="text"
          placeholder="Filtrar por descripción, monto o fecha..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {/* Botón para limpiar el filtro si hay un término de búsqueda */}
        {searchTerm && <button onClick={() => setSearchTerm('')} className="clear-search-button">X</button>}
      </div>

      {/* Lista de gastos */}
      <div className="expense-list animated-fade-in">
        <h2>Mis Gastos (Página {currentPage} de {lastPage})</h2>
        {isLoading ? ( // Muestra mensaje de carga para la lista
          <p>Cargando lista de gastos...</p>
        ) : (
          <>
            {/* Mensajes condicionales según el estado de los datos */}
            {filteredExpenses.length === 0 && searchTerm ? (
                <p>No se encontraron gastos que coincidan con su búsqueda en esta página.</p>
            ) : totalItemsGlobal === 0 ? ( // Si no hay ningún gasto en la BD
              <p>No hay gastos registrados. ¡Empieza a añadir algunos!</p>
            ) : (
              <ul>
                {/* Corrección del error de la clave (key) para los elementos de la lista */}
                {filteredExpenses.map((expense, index) => ( // <-- Añadimos 'index' aquí
                  <li
                    // La clave (key) debe ser única y estable. Idealmente, el 'id' de la DB.
                    // Si el 'id' no es válido, usamos una clave de respaldo más robusta.
                    key={expense.id != null && expense.id > 0 // Verificamos si el ID es válido
                        ? expense.id
                        : `${expense.description || 'no-desc'}-${index}-${Math.random()}` // Clave de respaldo si ID no es válido
                    }
                    className="expense-item animated-slide-in"
                  >
                    <span className="expense-info">
                      {/* Solución al error de monto: Comprueba que 'amount' sea un número */}
                      <span className="expense-amount">
                        ${typeof expense.amount === 'number' ? expense.amount.toFixed(2) : 'N/A'}
                      </span>
                      <span className="expense-description">{expense.description}</span>
                      {/* Solución al error de fecha: Comprueba que 'dateRecorded' sea un string válido */}
                      <small className="expense-date">
                        {expense.dateRecorded && !isNaN(new Date(expense.dateRecorded).getTime())
                            ? new Date(expense.dateRecorded).toLocaleDateString()
                            : 'Fecha desconocida'}
                      </small>
                    </span>
                    <button onClick={() => handleDeleteExpense(expense.id)} className="delete-button">
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Controles de Paginación: solo se muestran si hay más de una página */}
      {lastPage > 1 && (
        <div className="pagination-controls animated-fade-in">
          <button
            onClick={() => setCurrentPage(currentPage - 1)} // Retrocede una página
            disabled={currentPage === 1 || isLoading} // Deshabilitado en la primera página o si está cargando
            className="pagination-button"
          >
            Anterior
          </button>
          {renderPaginationButtons()} {/* Renderiza los botones numéricos */}
          <button
            onClick={() => setCurrentPage(currentPage + 1)} // Avanza una página
            disabled={currentPage === lastPage || isLoading} // Deshabilitado en la última página o si está cargando
            className="pagination-button"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

export default App;