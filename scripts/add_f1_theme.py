
import json
import os

themes_path = '/home/home/ReactNative/Telegram/undercover-bot/data/themes.json'

f1_data = [
    ["Lewis Hamilton", "Max Verstappen", "Charles Leclerc", "Lando Norris", "Fernando Alonso", "George Russell", "Carlos Sainz", "Oscar Piastri", "Sergio Perez", "Alexander Albon", "Pierre Gasly", "Esteban Ocon"],
    ["Michael Schumacher", "Ayrton Senna", "Niki Lauda", "Alain Prost", "Sebastian Vettel", "Jim Clark", "Juan Manuel Fangio", "James Hunt", "Mika Hakkinen", "Nelson Piquet", "Nigel Mansell", "Emerson Fittipaldi"],
    ["Mercedes", "Red Bull Racing", "Ferrari", "McLaren", "Aston Martin", "Alpine", "Williams", "Haas", "Sauber", "RB Visa Cash App"],
    ["Silverstone", "Monaco", "Monza", "Spa-Francorchamps", "Suzuka", "Interlagos", "Zandvoort", "Marina Bay", "Yas Marina", "Albert Park", "Imola", "Circuit of the Americas"],
    ["DRS", "Pit Stop", "Paddock", "Parc Ferme", "Overcut", "Undercut", "Apex", "G-force", "Aerodynamics", "Downforce", "Slipstream", "Dirty Air", "Porpoising"],
    ["Qualifying", "Free Practice", "Pole Position", "Safety Car", "VSC", "Checkered Flag", "Podium", "Grand Prix", "Stewards", "Blue Flag", "Red Flag"]
]

if os.path.exists(themes_path):
    with open(themes_path, 'r') as f:
        data = json.load(f)
    
    data['themes']['F1'] = f1_data
    
    with open(themes_path, 'w') as f:
        json.dump(data, f, indent=2)
    print("Successfully added F1 category to themes.json")
else:
    print("Error: themes.json not found")
