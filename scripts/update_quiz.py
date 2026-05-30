
import json
import os

quiz_path = '/home/home/ReactNative/Telegram/undercover-bot/data/quiz.json'

football_questions = [
    {"q": "Who has won the most Ballon d'Or awards?", "a": "Lionel Messi", "v": ["messi", "lionel messi", "leo messi"]},
    {"q": "Which country has won the most FIFA World Cups?", "a": "Brazil", "v": ["brazil", "bra"]},
    {"q": "Who is the all-time top scorer in the UEFA Champions League?", "a": "Cristiano Ronaldo", "v": ["ronaldo", "cristiano", "cr7", "cristiano ronaldo"]},
    {"q": "Which club has won the most Champions League titles?", "a": "Real Madrid", "v": ["real madrid", "madrid", "real"]},
    {"q": "Who was known as 'The King' (O Rei) of football?", "a": "Pele", "v": ["pele", "edson arantes do nascimento"]},
    {"q": "Which country won the 2022 FIFA World Cup?", "a": "Argentina", "v": ["argentina", "arg"]},
    {"q": "Who is the all-time top scorer for the England national team?", "a": "Harry Kane", "v": ["kane", "harry kane"]},
    {"q": "Which stadium is known as 'The Theatre of Dreams'?", "a": "Old Trafford", "v": ["old trafford", "manchester united"]},
    {"q": "In which city is the club FC Barcelona based?", "a": "Barcelona", "v": ["barcelona", "barca"]},
    {"q": "Who won the 2023 Women's World Cup?", "a": "Spain", "v": ["spain", "espana"]},
    {"q": "Which player is famous for the 'Hand of God' goal?", "a": "Diego Maradona", "v": ["maradona", "diego maradona"]},
    {"q": "What is the maximum number of players on a football pitch for one team?", "a": "11", "v": ["11", "eleven"]},
    {"q": "Which league is known as the 'EPL'?", "a": "English Premier League", "v": ["premier league", "epl", "english premier league"]},
    {"q": "Who is the current manager of Manchester City (2024)?", "a": "Pep Guardiola", "v": ["pep", "guardiola", "pep guardiola"]},
    {"q": "Which country hosted the first ever FIFA World Cup in 1930?", "a": "Uruguay", "v": ["uruguay"]},
    {"q": "What is the standard length of a professional football match (excluding extra time)?", "a": "90 minutes", "v": ["90", "90 minutes"]},
    {"q": "Who is nicknamed 'The Egyptian King' at Liverpool?", "a": "Mohamed Salah", "v": ["salah", "mo salah", "mohamed salah"]},
    {"q": "Which club does Erling Haaland play for (as of 2024)?", "a": "Manchester City", "v": ["man city", "city", "manchester city"]},
    {"q": "Who won the 2023 Ballon d'Or Feminin?", "a": "Aitana Bonmati", "v": ["bonmati", "aitana bonmati"]},
    {"q": "Which country won the Euro 2020 (played in 2021)?", "a": "Italy", "v": ["italy", "ita"]},
    {"q": "What is the nickname of the French national team?", "a": "Les Bleus", "v": ["les bleus", "france"]},
    {"q": "Which player is known for his 'Siu' celebration?", "a": "Cristiano Ronaldo", "v": ["ronaldo", "cr7"]},
    {"q": "Which German club is known as 'Die Bayern'?", "a": "Bayern Munich", "v": ["bayern", "bayern munich", "fc bayern"]},
    {"q": "Who is the youngest player to score in a World Cup final?", "a": "Pele", "v": ["pele"]},
    {"q": "Which city is home to both AC Milan and Inter Milan?", "a": "Milan", "v": ["milan", "milano"]},
    {"q": "Who won the Premier League title in the 2015-16 season in a huge upset?", "a": "Leicester City", "v": ["leicester", "leicester city"]},
    {"q": "Which country is nicknamed 'The Oranje'?", "a": "Netherlands", "v": ["netherlands", "holland"]},
    {"q": "Who is the top scorer in FIFA World Cup history?", "a": "Miroslav Klose", "v": ["klose", "miroslav klose"]},
    {"q": "Which stadium hosted the 2022 World Cup final?", "a": "Lusail Stadium", "v": ["lusail"]},
    {"q": "What color card is shown to a player for a direct sending off?", "a": "Red", "v": ["red", "red card"]},
    {"q": "Who is the most expensive football player ever (as of 2024 transfer fee)?", "a": "Neymar", "v": ["neymar", "neymar jr"]},
    {"q": "Which manager is famous for the 'Tiki-taka' style?", "a": "Pep Guardiola", "v": ["pep", "guardiola"]},
    {"q": "Which club is known as 'The Red Devils'?", "a": "Manchester United", "v": ["man utd", "united", "manchester united"]},
    {"q": "Who won the first ever Ballon d'Or in 1956?", "a": "Stanley Matthews", "v": ["stanley matthews", "matthews"]},
    {"q": "Which African country was the first to reach a World Cup semi-final?", "a": "Morocco", "v": ["morocco"]},
    {"q": "What does VAR stand for?", "a": "Video Assistant Referee", "v": ["var", "video assistant referee"]},
    {"q": "Which club plays at the Anfield stadium?", "a": "Liverpool", "v": ["liverpool", "lfc"]},
    {"q": "Who is the all-time top scorer for Brazil (passing Pele)?", "a": "Neymar", "v": ["neymar", "neymar jr"]},
    {"q": "Which country won the 2010 FIFA World Cup?", "a": "Spain", "v": ["spain", "espana"]},
    {"q": "Who was the first goalkeeper to win the Ballon d'Or?", "a": "Lev Yashin", "v": ["lev yashin", "yashin", "the black spider"]},
    {"q": "Which club is nicknamed 'The Gunners'?", "a": "Arsenal", "v": ["arsenal"]},
    {"q": "In which country was Zlatan Ibrahimovic born?", "a": "Sweden", "v": ["sweden"]},
    {"q": "Who is the current captain of the France national team (2024)?", "a": "Kylian Mbappe", "v": ["mbappe", "kylian mbappe"]},
    {"q": "Which team won the treble (PL, FA Cup, CL) in 1999?", "a": "Manchester United", "v": ["man utd", "manchester united"]},
    {"q": "Which country is famous for 'Total Football'?", "a": "Netherlands", "v": ["netherlands", "holland"]},
    {"q": "Who is nicknamed 'The Special One'?", "a": "Jose Mourinho", "alias": ["mourinho", "jose mourinho"]},
    {"q": "Which club has the motto 'Mes que un club'?", "a": "FC Barcelona", "v": ["barca", "barcelona", "fc barcelona"]},
    {"q": "Who scored the winning goal in the 2014 World Cup final?", "a": "Mario Gotze", "v": ["gotze", "mario gotze"]},
    {"q": "Which country won the first Euro title in 1960?", "a": "Soviet Union", "v": ["soviet union", "ussr"]},
    {"q": "Which player is known as 'Zizou'?", "a": "Zinedine Zidane", "v": ["zidane", "zizou", "zinedine zidane"]}
]

if os.path.exists(quiz_path):
    with open(quiz_path, 'r') as f:
        old_data = json.load(f)
    
    # Restructure to Categories
    new_data = {
        "categories": {
            "Cricket": old_data.get("questions", []),
            "Football": football_questions
        }
    }
    
    with open(quiz_path, 'w') as f:
        json.dump(new_data, f, indent=2)
    print("Successfully categorized quiz.json and added Football questions.")
else:
    print("Error: quiz.json not found")
