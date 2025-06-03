#!/usr/bin/env python3
import sys
import json
import genanki
import random

def create_anki_deck(flashcards_json, output_path):
    """Create an Anki deck from flashcard data."""
    try:
        # Parse flashcards JSON
        flashcards = json.loads(flashcards_json)
        
        # Create a unique deck ID
        deck_id = random.randrange(1 << 30, 1 << 31)
        
        # Create the deck
        deck = genanki.Deck(
            deck_id,
            'Python Syntax Flashcards'
        )
        
        # Define the note model (card template)
        model_id = random.randrange(1 << 30, 1 << 31)
        note_model = genanki.Model(
            model_id,
            'Python Syntax Model',
            fields=[
                {'name': 'Question'},
                {'name': 'Answer'},
                {'name': 'Topic'},
                {'name': 'Difficulty'},
            ],
            templates=[
                {
                    'name': 'Python Syntax Card',
                    'qfmt': '''
                        <div class="card">
                            <div class="question">{{Question}}</div>
                            {{#Topic}}<div class="topic">Topic: {{Topic}}</div>{{/Topic}}
                            {{#Difficulty}}<div class="difficulty">Level: {{Difficulty}}</div>{{/Difficulty}}
                        </div>
                    ''',
                    'afmt': '''
                        <div class="card">
                            <div class="question">{{Question}}</div>
                            <hr>
                            <div class="answer">{{Answer}}</div>
                            {{#Topic}}<div class="topic">Topic: {{Topic}}</div>{{/Topic}}
                            {{#Difficulty}}<div class="difficulty">Level: {{Difficulty}}</div>{{/Difficulty}}
                        </div>
                    ''',
                },
            ],
            css='''
                .card {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    font-size: 16px;
                    text-align: left;
                    color: #333;
                    background-color: #fff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .question {
                    font-size: 18px;
                    font-weight: 600;
                    margin-bottom: 15px;
                    color: #1976D2;
                }
                
                .answer {
                    background-color: #1e1e1e;
                    color: #4ade80;
                    padding: 15px;
                    border-radius: 6px;
                    font-family: 'JetBrains Mono', 'Courier New', monospace;
                    font-size: 14px;
                    white-space: pre-wrap;
                    margin: 15px 0;
                    overflow-x: auto;
                }
                
                .topic {
                    font-size: 12px;
                    color: #666;
                    margin-top: 10px;
                    padding: 4px 8px;
                    background-color: #f0f0f0;
                    border-radius: 4px;
                    display: inline-block;
                }
                
                .difficulty {
                    font-size: 12px;
                    color: #666;
                    margin-top: 5px;
                    padding: 4px 8px;
                    background-color: #e3f2fd;
                    border-radius: 4px;
                    display: inline-block;
                    margin-left: 5px;
                }
                
                hr {
                    border: none;
                    border-top: 2px solid #e0e0e0;
                    margin: 15px 0;
                }
            '''
        )
        
        # Add notes to the deck
        for card in flashcards:
            note = genanki.Note(
                model=note_model,
                fields=[
                    card.get('question', ''),
                    card.get('answer', ''),
                    card.get('topic', ''),
                    card.get('difficulty', ''),
                ]
            )
            deck.add_note(note)
        
        # Create and save the deck package
        package = genanki.Package(deck)
        package.write_to_file(output_path)
        
        print(f"Successfully created Anki deck with {len(flashcards)} cards")
        
    except Exception as e:
        print(f"Error creating Anki deck: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python anki-generator.py <flashcards_json> <output_path>", file=sys.stderr)
        sys.exit(1)
    
    flashcards_json = sys.argv[1]
    output_path = sys.argv[2]
    
    create_anki_deck(flashcards_json, output_path)
