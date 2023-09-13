class LinkedList<T> {
    value: T
    next?: LinkedList<T>
    constructor(value: T, next?: LinkedList<T>) {
        this.value = value
        this.next = next
    }
}

export class Queue<T> {
    private head?: LinkedList<T>
    private tail?: LinkedList<T>
    private _size = 0

    isEmpty() {
        return this._size == 0
    }

    add(message: T) {
        const record = new LinkedList(message)
        if (!this.tail) {
            this.head = record
            this.tail = this.head
        } else {
            this.tail.next = record
        }
        ++this._size
    }

    poll() {
        if (this.head) {
            const res = this.head
            this.head = this.head.next
            if (!this.head) {
                this.tail = this.head
            }
            --this._size
            return res.value
        } else {
            return null
        }
    }

    get size() {
        return this._size
    }
}
