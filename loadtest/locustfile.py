from locust import FastHttpUser, task
import random

words = ["{}_{}".format(i, random.randint(0, 1000)) for i in range(10)]
print(words)
weighted_words = []
times = 1
for w in words:
    for i in range(times):
        weighted_words.append(w)
    times += 1
    

class HelloWorldUser(FastHttpUser):
    @task
    def hello_world(self):
        self.client.get("/dev/kognitos/api/v1/word?word={}".format(weighted_words[random.randint(0, len(weighted_words) - 1)]))