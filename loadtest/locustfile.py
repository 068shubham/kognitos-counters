from locust import FastHttpUser, task
import random
import uuid

def mycmp(obj1, obj2):
    return len(obj1) - len(obj2)

def cmp_to_key(mycmp):
    'Convert a cmp= function into a key= function'
    class K(object):
        def __init__(self, obj, *args):
            self.obj = obj
        def __lt__(self, other):
            return mycmp(self.obj, other.obj) < 0
        def __gt__(self, other):
            return mycmp(self.obj, other.obj) > 0
        def __eq__(self, other):
            return mycmp(self.obj, other.obj) == 0
        def __le__(self, other):
            return mycmp(self.obj, other.obj) <= 0  
        def __ge__(self, other):
            return mycmp(self.obj, other.obj) >= 0
        def __ne__(self, other):
            return mycmp(self.obj, other.obj) != 0
    return K

words = set()
while len(words) < 50:
    words.add("{}{}".format(uuid.uuid4(),uuid.uuid4()).replace("-", "")[:random.randint(3, 55)])
[print(word) for word in sorted(words, key=cmp_to_key(mycmp))]

weighted_words = []
times = 10
for w in words:
    for i in range(times):
        weighted_words.append(w)
    times += 10

print(len(weighted_words))

class HelloWorldUser(FastHttpUser):
    @task
    def hello_world(self):
        self.client.get("/api/v1/word?word={}".format(weighted_words[random.randint(0, len(weighted_words) - 1)]))