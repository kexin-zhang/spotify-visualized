import spotipy 
from spotipy.oauth2 import SpotifyClientCredentials
from csv import DictReader, DictWriter

USER_ID = 'spotify:user:spotify'
PLAYLIST_ID = 'spotify:user:spotify:playlist:37i9dQZF1DXaqCgtv7ZR3L'

client_credentials_manager = SpotifyClientCredentials()
sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)

sp_info = []
features = []

tracks = sp.user_playlist_tracks(USER_ID, PLAYLIST_ID)
tracks = [item["track"] for item in tracks["items"]]

print(tracks[0])
ids = [track['id'] for track in tracks]

features = sp.audio_features(ids)
print(len(tracks))
print(len(features))

out = []
for i in range(len(ids)):
    track = {}
    track["name"] = tracks[i]["name"]
    track["artist"] = tracks[i]["artists"][0]["name"]
    track["album"] = tracks[i]["album"]["name"]
    track["date"] = tracks[i]["album"]["release_date"][:4]
    track["explicit"] = tracks[i]["explicit"]

    if len(tracks[i]["artists"]) > 1:
        featured = ", ".join([artist["name"] for artist in tracks[i]["artists"][1:]])
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
    track["popularity"] = tracks[i]["popularity"]

    out.append(track)

fields = ["name", "artist", "album", "date", "explicit", "features", "acousticness", "danceability", "energy", "key", "loudness", "speechiness", "tempo", "valence", "popularity"]
with open("songs2020.csv", "w") as f:
    writer = DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(out)