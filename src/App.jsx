import { useState } from "react";
import "./App.css"; // importa il CSS

// ----- Utility per il mazzo (ogni carta ha un id univoco) -----
function createDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  let deck = [];
  let id = 1;
  for (let suit of suits) {
    for (let value of values) {
      deck.push({ id: id++, suit, value });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function valueToNumber(value) {
  if (value === "A") return 1;
  if (value === "J") return 11;
  if (value === "Q") return 12;
  if (value === "K") return 13;
  return parseInt(value, 10);
}

function isTris(cards) {
  if (cards.length < 3) return false;
  const values = cards.map(c => c.value);
  if (new Set(values).size !== 1) return false;
  const suits = cards.map(c => c.suit);
  return new Set(suits).size === cards.length;
}

function isScale(cards) {
  if (cards.length < 3) return false;
  const suits = cards.map(c => c.suit);
  if (new Set(suits).size !== 1) return false;
  const numbers = cards.map(c => valueToNumber(c.value)).sort((a, b) => a - b);
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] !== numbers[i - 1] + 1) return false;
  }
  return true;
}

function isValidCombination(cards) {
  return isTris(cards) || isScale(cards);
}

// ----- App principale (id-based selection) -----
export default function App() {
  const [deck, setDeck] = useState(createDeck());
  const [hands, setHands] = useState([[], []]); // due giocatori
  const [selectedIds, setSelectedIds] = useState([]); // IDs carte selezionate
  const [table, setTable] = useState([]); // array di combinazioni
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [winner, setWinner] = useState(null);

  // Helper: trova oggetti carta nella mano corrente a partire da id
  const getSelectedCardsObjects = () => {
    const hand = hands[currentPlayer];
    return selectedIds.map(id => hand.find(c => c.id === id)).filter(Boolean);
  };

  // Distribuisci 5 carte iniziali
  const dealCards = () => {
    if (winner !== null) return;
    let newDeck = [...deck];
    let newHands = [[], []];
    for (let p = 0; p < 2; p++) {
      for (let i = 0; i < 5; i++) {
        newHands[p].push(newDeck.pop());
      }
    }
    setDeck(newDeck);
    setHands(newHands);
    setSelectedIds([]);
  };

  // Pesca una carta
  const drawCard = () => {
    if (winner !== null) return;
    if (deck.length === 0) return;
    const newDeck = [...deck];
    const card = newDeck.pop();
    const newHands = [...hands];
    newHands[currentPlayer] = [...newHands[currentPlayer], card];
    setDeck(newDeck);
    setHands(newHands);
  };

  // Reset
  const resetGame = () => {
    setDeck(createDeck());
    setHands([[], []]);
    setSelectedIds([]);
    setTable([]);
    setCurrentPlayer(0);
    setWinner(null);
  };

  // Seleziona/deseleziona carta tramite id
  const toggleSelectById = (id) => {
    if (winner !== null) return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Cala combinazione valida
  const playCombination = () => {
    if (winner !== null) return;
    if (selectedIds.length < 3) { alert("Seleziona almeno 3 carte."); return; }

    const selectedCards = getSelectedCardsObjects();
    if (selectedCards.length !== selectedIds.length) { 
      alert("Errore: alcune carte non trovate nella mano."); 
      setSelectedIds([]); 
      return; 
    }

    if (isValidCombination(selectedCards)) {
      const newTable = [...table, selectedCards];
      const newHands = [...hands];
      newHands[currentPlayer] = newHands[currentPlayer].filter(c => !selectedIds.includes(c.id));
      setTable(newTable);
      setHands(newHands);
      setSelectedIds([]);

      if (newHands[currentPlayer].length === 0) {
        setWinner(currentPlayer);
      }
    } else {
      alert("❌ Non è una combinazione valida!");
    }
  };

  // Passa turno
  const endTurn = () => {
    if (winner !== null) return;
    setSelectedIds([]);
    setCurrentPlayer((currentPlayer + 1) % 2);
  };

  // DRAG & DROP
  const onDragStart = (e, cardId, comboIndex) => {
    if (winner !== null) return;
    e.dataTransfer.setData("cardId", String(cardId));
    e.dataTransfer.setData("fromCombo", String(comboIndex));
  };

  const onDrop = (e, comboIndex) => {
    if (winner !== null) return;
    const cardId = Number(e.dataTransfer.getData("cardId"));
    const fromCombo = Number(e.dataTransfer.getData("fromCombo"));

    if (isNaN(cardId) || isNaN(fromCombo)) return;
    if (fromCombo === comboIndex) return;

    let newTable = table.map(combo => combo.slice());
    const removed = newTable[fromCombo].filter(c => c.id === cardId);
    newTable[fromCombo] = newTable[fromCombo].filter(c => c.id !== cardId);
    if (removed.length === 0) { 
      alert("Carta non trovata nella combinazione di origine."); 
      return; 
    }
    newTable[comboIndex] = [...newTable[comboIndex], removed[0]];

    const validDest = isValidCombination(newTable[comboIndex]);
    const validFrom = (newTable[fromCombo].length === 0) ? true : isValidCombination(newTable[fromCombo]);

    if (validDest && validFrom) {
      newTable = newTable.filter(combo => combo.length > 0);
      setTable(newTable);
    } else {
      alert("❌ Mossa non valida! Le combinazioni devono restare valide.");
    }
  };

  // Debug
  const logState = () => {
    console.log("Deck:", deck.length, deck.slice(0,6));
    console.log("Hands:", hands.map(h => h.map(c => `${c.value}${c.suit}#${c.id}`)));
    console.log("SelectedIds:", selectedIds);
    console.log("Table:", table.map(combo => combo.map(c => `${c.value}${c.suit}#${c.id}`)));
  };

  return (
    <div className="container">
      <h1>🃏 Gioco Macchiavelli</h1>

      {winner !== null ? (
        <h2 style={{ color: "lightgreen" }}>🎉 Giocatore {winner + 1} ha vinto! 🎉</h2>
      ) : (
        <h2>Turno: Giocatore {currentPlayer + 1}</h2>
      )}

      <div style={{ marginBottom: 12 }}>
        <button onClick={dealCards} disabled={winner !== null}>Distribuisci 5</button>
        <button onClick={drawCard} disabled={winner !== null}>Pesca</button>
        <button onClick={playCombination} disabled={winner !== null}>Cala combinazione</button>
        <button onClick={endTurn} disabled={winner !== null}>Passa turno</button>
        <button onClick={resetGame}>Ricomincia</button>
        <button onClick={logState} style={{ marginLeft: 8 }}>Log (console)</button>
      </div>

      {winner === null && (
        <>
          <h2>Mano Giocatore {currentPlayer + 1}:</h2>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
            {hands[currentPlayer].map((card) => {
              const isSelected = selectedIds.includes(card.id);
              return (
                <div
                  key={card.id}
                  onClick={() => toggleSelectById(card.id)}
                  className={`card ${card.suit === "♥" || card.suit === "♦" ? "red" : ""} ${isSelected ? "selected" : ""}`}
                >
                  {card.value} {card.suit}
                </div>
              );
            })}
          </div>
        </>
      )}

      <h2>Tavolo:</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
        {table.length === 0 && <p>Nessuna combinazione calata.</p>}
        {table.map((combo, i) => (
          <div
            key={i}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, i)}
            className="table-combo"
          >
            {combo.map((card) => (
              <div
                key={card.id}
                draggable={winner === null}
                onDragStart={(e) => onDragStart(e, card.id, i)}
                className={`card ${card.suit === "♥" || card.suit === "♦" ? "red" : ""}`}
              >
                {card.value} {card.suit}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
