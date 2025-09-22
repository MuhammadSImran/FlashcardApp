// App.js - App Store Ready Flashcard App
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  TextInput, 
  Modal, 
  Animated, 
  StatusBar,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [flashcards, setFlashcards] = useState([]);
  const [decks, setDecks] = useState([{ id: 'default', name: 'My Cards', cards: [] }]);
  const [currentDeck, setCurrentDeck] = useState('default');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [studyMode, setStudyMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  // Load data when app starts
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedDecks = await AsyncStorage.getItem('decks');
      
      if (savedDecks) {
        const decksData = JSON.parse(savedDecks);
        
        // Validate data structure
        if (Array.isArray(decksData) && decksData.length > 0) {
          setDecks(decksData);
          // Load cards from current deck
          const currentDeckData = decksData.find(deck => deck.id === currentDeck);
          if (currentDeckData && Array.isArray(currentDeckData.cards)) {
            setFlashcards(currentDeckData.cards);
          }
        } else {
          // Fallback to default deck if data is corrupted
          console.warn('Corrupted deck data, using default');
          await resetToDefault();
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(
        'Error Loading Data',
        'There was a problem loading your flashcards. Starting fresh.',
        [{ text: 'OK', onPress: resetToDefault }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentDeck]);

  const resetToDefault = async () => {
    const defaultDecks = [{ id: 'default', name: 'My Cards', cards: [] }];
    setDecks(defaultDecks);
    setFlashcards([]);
    setCurrentDeck('default');
    await saveData(defaultDecks);
  };

  const saveData = useCallback(async (decksData) => {
    try {
      setIsSaving(true);
      // Validate data before saving
      if (!Array.isArray(decksData)) {
        throw new Error('Invalid data format');
      }
      
      await AsyncStorage.setItem('decks', JSON.stringify(decksData));
    } catch (error) {
      console.error('Error saving data:', error);
      Alert.alert(
        'Save Error',
        'Failed to save your changes. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  }, []);

  const createDeck = useCallback(async () => {
    if (!newDeckName.trim()) {
      Alert.alert('Error', 'Please enter a deck name');
      return;
    }

    // Check for duplicate names
    if (decks.some(deck => deck.name.toLowerCase() === newDeckName.trim().toLowerCase())) {
      Alert.alert('Error', 'A deck with this name already exists');
      return;
    }

    try {
      const newDeck = {
        id: Date.now().toString(),
        name: newDeckName.trim(),
        cards: []
      };
      const updatedDecks = [...decks, newDeck];
      setDecks(updatedDecks);
      await saveData(updatedDecks);
      setNewDeckName('');
      setShowDeckModal(false);
      Alert.alert('Success!', 'New deck created');
    } catch (error) {
      Alert.alert('Error', 'Failed to create deck. Please try again.');
    }
  }, [newDeckName, decks, saveData]);

  const deleteDeck = (deckId) => {
    // Don't allow deleting the last deck
    if (decks.length <= 1) {
      Alert.alert('Cannot Delete', 'You must have at least one deck');
      return;
    }

    const deckToDelete = decks.find(deck => deck.id === deckId);
    
    Alert.alert(
      'Delete Deck',
      `Are you sure you want to delete "${deckToDelete.name}" and all its cards?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Remove the deck
            const updatedDecks = decks.filter(deck => deck.id !== deckId);
            setDecks(updatedDecks);
            saveData(updatedDecks);
            
            // If we deleted the current deck, switch to the first remaining deck
            if (currentDeck === deckId) {
              const newCurrentDeck = updatedDecks[0].id;
              setCurrentDeck(newCurrentDeck);
              setFlashcards(updatedDecks[0].cards || []);
            }
          }
        }
      ]
    );
  };

  const switchDeck = (deckId) => {
    setCurrentDeck(deckId);
    const selectedDeck = decks.find(deck => deck.id === deckId);
    if (selectedDeck) {
      setFlashcards(selectedDeck.cards || []);
    }
  };

  const getCurrentDeckName = () => {
    const deck = decks.find(deck => deck.id === currentDeck);
    return deck ? deck.name : 'My Cards';
  };

  const addCard = () => {
    setShowAddModal(true);
  };

  const saveCard = useCallback(async () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert('Error', 'Please fill in both question and answer');
      return;
    }

    try {
      const newCard = {
        id: Date.now(),
        question: question.trim(),
        answer: answer.trim(),
        createdAt: new Date().toISOString(),
      };
      
      // Update current deck with new card
      const updatedDecks = decks.map(deck => {
        if (deck.id === currentDeck) {
          return { ...deck, cards: [...(deck.cards || []), newCard] };
        }
        return deck;
      });
      
      setDecks(updatedDecks);
      await saveData(updatedDecks);
      
      // Update local flashcards state
      setFlashcards(prev => [...prev, newCard]);
      
      setQuestion('');
      setAnswer('');
      setShowAddModal(false);
      Alert.alert('Success!', 'Flashcard added');
    } catch (error) {
      Alert.alert('Error', 'Failed to save card. Please try again.');
    }
  }, [question, answer, decks, currentDeck, saveData]);

  const deleteCard = (cardId) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this flashcard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Update current deck by removing the card
            const updatedDecks = decks.map(deck => {
              if (deck.id === currentDeck) {
                return { ...deck, cards: (deck.cards || []).filter(card => card.id !== cardId) };
              }
              return deck;
            });
            
            setDecks(updatedDecks);
            saveData(updatedDecks);
            
            // Update local flashcards state
            const updatedCards = flashcards.filter(card => card.id !== cardId);
            setFlashcards(updatedCards);
          }
        }
      ]
    );
  };

  const studyCards = () => {
    if (flashcards.length === 0) {
      Alert.alert('No Cards', 'Add some flashcards first!');
    } else {
      setStudyMode(true);
      setCurrentCardIndex(0);
      setShowAnswer(false);
      flipAnimation.setValue(0);
    }
  };

  const flipCard = () => {
    Animated.timing(flipAnimation, {
      toValue: showAnswer ? 0 : 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    setShowAnswer(!showAnswer);
  };

  const nextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
      flipAnimation.setValue(0);
    } else {
      // Automatically exit study mode when finished
      setStudyMode(false);
    }
  };

  // Show loading screen while app initializes
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#020B13" />
        <ActivityIndicator size="large" color="#DAAB2D" />
        <Text style={styles.loadingText}>Loading your flashcards...</Text>
      </View>
    );
  }

  const exitStudy = () => {
    setStudyMode(false);
  };

  // Study Mode Screen
  if (studyMode) {
    const currentCard = flashcards[currentCardIndex];
    
    const frontInterpolate = flipAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });
    const backInterpolate = flipAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['180deg', '360deg'],
    });
    
    return (
      <View style={styles.safeContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#020B13" />
        
        {/* Study Header */}
        <View style={styles.studyHeader}>
          <TouchableOpacity onPress={exitStudy} style={styles.backButtonContainer}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.progress}>
            {currentCardIndex + 1} / {flashcards.length}
          </Text>
          <View style={styles.spacer} />
        </View>

        {/* Card Area */}
        <View style={styles.studyContent}>
          <View style={styles.cardContainer}>
            <TouchableOpacity onPress={flipCard} style={styles.cardTouchArea}>
              <View style={styles.cardFlipContainer}>
                {/* Front of card (Question) */}
                <Animated.View style={[
                  styles.card, 
                  styles.cardFront, 
                  { transform: [{ rotateY: frontInterpolate }] }
                ]}>
                  <Text style={styles.cardText}>{currentCard.question}</Text>
                  <Text style={styles.cardLabel}>Question</Text>
                </Animated.View>
                
                {/* Back of card (Answer) */}
                <Animated.View style={[
                  styles.card, 
                  styles.cardBack, 
                  { transform: [{ rotateY: backInterpolate }] }
                ]}>
                  <Text style={styles.cardText}>{currentCard.answer}</Text>
                  <Text style={styles.cardLabel}>Answer</Text>
                </Animated.View>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>Tap card to flip</Text>

          <TouchableOpacity style={styles.nextButton} onPress={nextCard}>
            <Text style={styles.buttonText}>
              {currentCardIndex === flashcards.length - 1 ? 'Finish' : 'Next Card'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Home Screen
  return (
    <View style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#020B13" />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.homeHeader}>
          <Text style={styles.title}>{getCurrentDeckName()}</Text>
          <Text style={styles.count}>{flashcards.length} cards total</Text>
        </View>
        
        {/* Deck Selector */}
        <View style={styles.deckSelector}>
          <Text style={styles.sectionTitle}>Select Deck:</Text>
          <Text style={styles.deckHint}>Long press to delete deck</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deckScrollView}>
            {decks.map((deck) => (
              <TouchableOpacity
                key={deck.id}
                style={[
                  styles.deckTab,
                  currentDeck === deck.id && styles.activeDeckTab
                ]}
                onPress={() => switchDeck(deck.id)}
                onLongPress={() => deleteDeck(deck.id)}
              >
                <Text style={[
                  styles.deckTabText,
                  currentDeck === deck.id && styles.activeDeckTabText
                ]}>
                  {deck.name}
                </Text>
                <Text style={[
                  styles.deckCardCount,
                  currentDeck === deck.id && styles.activeDeckCardCount
                ]}>
                  {(deck.cards || []).length} cards
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.addDeckTab}
              onPress={() => setShowDeckModal(true)}
            >
              <Text style={styles.addDeckText}>+ New Deck</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        
        {/* Show existing cards */}
        {flashcards.length > 0 && (
          <View style={styles.cardsListContainer}>
            <Text style={styles.sectionTitle}>Your Cards:</Text>
            {flashcards.map((card) => (
              <View key={card.id} style={styles.cardListItem}>
                <View style={styles.cardPreview}>
                  <Text style={styles.cardPreviewQuestion} numberOfLines={1}>
                    Q: {card.question}
                  </Text>
                  <Text style={styles.cardPreviewAnswer} numberOfLines={1}>
                    A: {card.answer}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.deleteCardButton}
                  onPress={() => deleteCard(card.id)}
                >
                  <Text style={styles.deleteCardText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.addButton} onPress={addCard}>
            <Text style={styles.buttonText}>+ Add New Card</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.studyButton} onPress={studyCards}>
            <Text style={styles.buttonText}>📚 Study Cards</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Card Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Flashcard</Text>
              
              <Text style={styles.label}>Question:</Text>
              <TextInput
                style={styles.input}
                value={question}
                onChangeText={setQuestion}
                placeholder="Enter your question"
                multiline
                returnKeyType="next"
                onSubmitEditing={() => {}}
              />
              
              <Text style={styles.label}>Answer:</Text>
              <TextInput
                style={styles.input}
                value={answer}
                onChangeText={setAnswer}
                placeholder="Enter your answer"
                multiline
                returnKeyType="done"
                blurOnSubmit={true}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => {
                    setShowAddModal(false);
                    setQuestion('');
                    setAnswer('');
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.saveButton} onPress={saveCard}>
                  <Text style={styles.saveText}>
                    {isSaving ? 'Saving...' : 'Save Card'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Deck Modal */}
      <Modal visible={showDeckModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create New Deck</Text>
              
              <Text style={styles.label}>Deck Name:</Text>
              <TextInput
                style={styles.input}
                value={newDeckName}
                onChangeText={setNewDeckName}
                placeholder="Enter deck name"
                returnKeyType="done"
                onSubmitEditing={createDeck}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => {
                    setShowDeckModal(false);
                    setNewDeckName('');
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.saveButton} onPress={createDeck}>
                  <Text style={styles.saveText}>
                    {isSaving ? 'Creating...' : 'Create Deck'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#020B13', // Luxury dark background
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020B13',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    color: '#DAAB2D',
    fontSize: 18,
    marginTop: 20,
    fontWeight: '600',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  homeHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#DAAB2D', // Gold color
    marginBottom: 10,
    textAlign: 'center',
  },
  count: {
    fontSize: 18,
    color: '#A57A03', // Darker gold
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 20,
    marginTop: 20,
  },
  // Deck Styles
  deckSelector: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DAAB2D', // Gold
    marginBottom: 5,
  },
  deckHint: {
    fontSize: 14,
    color: '#A57A03', // Darker gold
    marginBottom: 15,
    fontStyle: 'italic',
  },
  deckScrollView: {
    flexDirection: 'row',
  },
  deckTab: {
    backgroundColor: '#262626', // Dark gray
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#A57A03',
  },
  activeDeckTab: {
    backgroundColor: '#DAAB2D', // Gold when active
  },
  deckTabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#A57A03',
  },
  activeDeckTabText: {
    color: '#020B13', // Dark text on gold background
  },
  deckCardCount: {
    fontSize: 12,
    color: '#A57A03',
    marginTop: 2,
  },
  activeDeckCardCount: {
    color: 'rgba(2, 11, 19, 0.8)', // Dark text on gold
  },
  addDeckTab: {
    backgroundColor: '#400128', // Purple accent
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#DAAB2D',
  },
  addDeckText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#DAAB2D',
  },
  // Cards List Styles
  cardsListContainer: {
    marginBottom: 30,
  },
  cardListItem: {
    backgroundColor: '#262626', // Dark gray
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#DAAB2D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#A57A03',
  },
  cardPreview: {
    flex: 1,
  },
  cardPreviewQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DAAB2D', // Gold
    marginBottom: 4,
  },
  cardPreviewAnswer: {
    fontSize: 14,
    color: '#A57A03', // Darker gold
  },
  deleteCardButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#400128', // Purple
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteCardText: {
    color: '#DAAB2D',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: 'linear-gradient(45deg, #DAAB2D, #A57A03)', // Gold gradient effect
    backgroundColor: '#DAAB2D', // Fallback gold
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#DAAB2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#A57A03',
  },
  studyButton: {
    backgroundColor: '#400128', // Purple
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#400128',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#DAAB2D',
  },
  buttonText: {
    color: '#020B13', // Dark text on gold
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Study Mode Styles
  studyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#262626', // Dark gray
    borderBottomWidth: 2,
    borderBottomColor: '#DAAB2D',
  },
  backButtonContainer: {
    flex: 1,
  },
  backButton: {
    fontSize: 18,
    color: '#DAAB2D', // Gold
    fontWeight: 'bold',
  },
  progress: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DAAB2D', // Gold
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
  studyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#020B13', // Dark background
  },
  cardContainer: {
    width: '100%',
    height: 350,
    marginBottom: 30,
  },
  cardTouchArea: {
    width: '100%',
    height: '100%',
  },
  cardFlipContainer: {
    width: '100%',
    height: '100%',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    shadowColor: '#DAAB2D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 15,
    backfaceVisibility: 'hidden',
    borderWidth: 3,
  },
  cardFront: {
    backgroundColor: '#FFFFFF', // Pure white background
    borderColor: '#DAAB2D',
  },
  cardBack: {
    backgroundColor: '#F8F8F8', // Light gray background
    borderColor: '#DAAB2D',
  },
  cardText: {
    color: '#DAAB2D', // Gold text
    fontSize: 28, // Even larger font
    fontWeight: '700', // Bolder weight
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: 0.5, // Better letter spacing
  },
  cardLabel: {
    position: 'absolute',
    top: 15,
    right: 15,
    color: '#FFFFFF', // White text
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: '#DAAB2D', // Gold background
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  hint: {
    fontSize: 16,
    color: '#A57A03', // Darker gold
    fontStyle: 'italic',
    marginBottom: 40,
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#DAAB2D', // Gold
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A57A03',
    shadowColor: '#DAAB2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 11, 19, 0.9)', // Dark overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#262626', // Dark gray
    borderRadius: 20,
    padding: 25,
    borderWidth: 2,
    borderColor: '#DAAB2D',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DAAB2D', // Gold
    marginBottom: 25,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DAAB2D', // Gold
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 2,
    borderColor: '#A57A03', // Darker gold border
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#020B13', // Dark input background
    color: '#DAAB2D', // Gold text
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 30,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#400128', // Purple
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DAAB2D',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#DAAB2D', // Gold
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A57A03',
  },
  cancelText: {
    color: '#DAAB2D', // Gold text
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveText: {
    color: '#020B13', // Dark text on gold
    fontSize: 16,
    fontWeight: 'bold',
  },
});