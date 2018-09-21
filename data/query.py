import spotipy 
from spotipy.oauth2 import SpotifyClientCredentials
from csv import DictReader, DictWriter

client_credentials_manager = SpotifyClientCredentials()
sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)

sp_info = []
features = []

with open("regional-global-weekly-latest.csv") as f:
    reader = DictReader(f)
    tracks = [row for row in reader]


ids = [track["URL"] for track in tracks]
# sp_info = sp.tracks(ids)["tracks"]

# features = sp.audio_features(ids)

for i in range(0, len(ids), 50):
    sp_info.extend(sp.tracks(ids[i:i+50])['tracks'])
    features.extend(sp.audio_features(ids[i:i+50]))

print(len(sp_info))
print(len(features))

out = []
for i in range(len(ids)):
    track = tracks[i]
    sp_track = sp_info[i]

    track["album"] = sp_track["album"]["name"]
    track["date"] = sp_track["album"]["release_date"][:4]
    track["explicit"] = sp_track["explicit"]

    if len(sp_track["artists"]) > 1:
        featured = ", ".join([artist["name"] for artist in sp_track["artists"][1:]])
        track["features"] = featured 
    else:
        track["features"] = "None"

    audio_features = features[i]
    track["acousticness"] = audio_features["acousticness"]
    track["danceability"] = audio_features["danceability"]
    track["energy"] = audio_features["energy"]
    track["key"] = audio_features["key"]
    track["loudness"] = audio_features["loudness"]
    track["speechiness"] = audio_features["speechiness"]
    track["tempo"] = audio_features["tempo"]
    track["valence"] = audio_features["valence"]

    out.append(track)

fields = ["Position", "Track Name", "Artist", "Streams", "URL", "album", "date", "explicit", "features", "acousticness", "danceability", "energy", "key", "loudness", "speechiness", "tempo", "valence"]
with open("songs.csv", "w") as f:
    writer = DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(tracks)
    

